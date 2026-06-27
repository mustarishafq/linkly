<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\DomainVerificationService;
use App\Support\IdGenerator;
use App\Support\SqlDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DomainController extends Controller
{
    public function __construct(
        private DomainVerificationService $domains,
        private AuditLogService $audit,
    ) {}

    public function verify(Request $request, string $id): JsonResponse
    {
        $domainId = trim($id);
        if ($domainId === '') {
            return $this->error('invalid_input', 'Domain ID is required', 400);
        }

        $row = DB::table('entity_customdomain')
            ->select('id', 'payload', 'created_date', 'updated_date')
            ->where('id', $domainId)
            ->first();

        if (! $row) {
            return $this->error('not_found', 'Domain not found', 404);
        }

        $payload = is_string($row->payload) ? json_decode($row->payload, true) : (array) $row->payload;
        $user = $request->attributes->get('auth_user');

        if (
            $user->role !== 'admin'
            && ! empty($payload['owner_user_id'])
            && (string) $payload['owner_user_id'] !== (string) $user->id
        ) {
            return $this->error('forbidden', 'You cannot verify this domain', 403);
        }

        $domain = $this->domains->normalizeHostname($payload['domain'] ?? '');
        if ($domain === '') {
            return $this->error('invalid_input', 'Invalid domain value', 400);
        }

        $token = (string) ($payload['verification_token'] ?? '');
        if ($token === '') {
            $token = substr(preg_replace('/[^a-zA-Z0-9]/', '', IdGenerator::make()), 0, 24);
        }

        $prefix = config('linkly.domain_verify_prefix', '_linkly');
        $verificationName = "{$prefix}.{$domain}";
        $verificationValue = "linkly-verification={$token}";

        $verification = $this->domains->verifyTxt($domain, $verificationValue);

        $updatedPayload = array_merge($payload, [
            'domain' => $domain,
            'verification_token' => $token,
            'verification_name' => $verificationName,
            'verification_value' => $verificationValue,
            'verification_status' => $verification['verified'] ? 'verified' : 'pending',
            'verification_error' => $verification['verified'] ? null : ($verification['error'] ?? null),
            'verification_checked_host' => $verification['checked_host'],
            'verification_last_checked_date' => now()->toIso8601String(),
            'verification_verified_date' => $verification['verified']
                ? ($payload['verification_verified_date'] ?? now()->toIso8601String())
                : ($payload['verification_verified_date'] ?? null),
        ]);

        DB::table('entity_customdomain')->where('id', $domainId)->update([
            'payload' => json_encode($updatedPayload),
            'updated_date' => SqlDate::now(),
        ]);

        $this->audit->entityUpdated(
            $user->id,
            'CustomDomain',
            $domainId,
            $payload,
            $updatedPayload,
            $verification['verified'] ? 'domain_verified' : 'domain_verify_failed'
        );

        return response()->json([
            'id' => $row->id,
            'created_date' => SqlDate::toIso8601($row->created_date),
            'updated_date' => now()->toIso8601String(),
            ...$updatedPayload,
            'verified' => $verification['verified'],
        ]);
    }
}
