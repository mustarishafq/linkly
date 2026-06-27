<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\JwtService;
use App\Services\NexusJwtService;
use App\Services\SettingsService;
use App\Services\SsoRedirectService;
use App\Support\IdGenerator;
use App\Support\SqlDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class SsoController extends Controller
{
    public function __construct(
        private SettingsService $settings,
        private NexusJwtService $nexusJwt,
        private SsoRedirectService $redirects,
        private JwtService $jwt,
        private AuditLogService $audit,
    ) {}

    public function verifyNexus(Request $request): JsonResponse
    {
        $clientIp = $request->ip() ?: 'unknown';
        $cacheKey = "sso_rate:{$clientIp}";

        $count = (int) Cache::get($cacheKey, 0);
        if ($count >= 10) {
            return $this->error('rate_limited', 'Too many SSO attempts. Try again later.', 429);
        }
        Cache::put($cacheKey, $count + 1, now()->addMinute());

        $token = trim((string) $request->input('token', ''));
        if ($token === '') {
            return $this->error('invalid_input', 'Token is required', 400);
        }

        $config = $this->settings->getNexusSsoConfig();
        if (! $this->settings->isSsoConfigured($config)) {
            return $this->error('sso_not_configured', 'SSO is not configured.', 422);
        }

        try {
            $claims = $this->nexusJwt->verify(
                $token,
                $config['secret'],
                $config['issuer'] ?: ''
            );
        } catch (\Throwable $error) {
            return $this->error('invalid_token', $error->getMessage() ?: 'Invalid token', 401);
        }

        try {
            $user = $this->findOrProvisionUser($config, $claims);
        } catch (\RuntimeException $error) {
            $status = $error->getCode() ?: 403;

            return $this->error($error->getMessage() === 'User account is not active.' ? 'user_inactive' : 'forbidden', $error->getMessage(), $status);
        }

        $allowedOrigins = $this->redirects->parseAllowedOrigins(config('linkly.frontend_url'));
        $redirectTo = $this->redirects->sanitizeRedirectTo(
            $request->input('redirect_to') ?: $request->query('redirect_to') ?: ($claims['redirect_to'] ?? null),
            $allowedOrigins
        );
        $returnTo = $this->redirects->sanitizeReturnTo(
            $request->input('return_to') ?: $request->query('return_to') ?: ($claims['return_to'] ?? null),
            $allowedOrigins
        );

        $safeUser = $this->jwt->toSafeUser($user);
        $sessionToken = $this->jwt->issueToken($safeUser);

        return response()->json([
            'token' => $sessionToken,
            'user' => $safeUser,
            'redirect_to' => $redirectTo,
            'return_to' => $returnTo,
        ]);
    }

    private function findOrProvisionUser(array $config, array $claims): object
    {
        $nexusSsoId = (string) $claims['sub'];
        $email = strtolower(trim((string) $claims['email']));
        $fullName = trim((string) ($claims['name'] ?? $claims['email'] ?? $email));

        $user = DB::table('users')->where('nexus_sso_id', $nexusSsoId)->first()
            ?: DB::table('users')->where('email', $email)->first();

        if ($user) {
            if (! $user->is_approved) {
                throw new \RuntimeException('User account is not active.', 403);
            }

            DB::table('users')->where('id', $user->id)->update([
                'nexus_sso_id' => $nexusSsoId,
                'full_name' => $fullName,
                'email' => $email,
                'updated_date' => SqlDate::now(),
            ]);

            $user = (object) array_merge((array) $user, [
                'nexus_sso_id' => $nexusSsoId,
                'full_name' => $fullName,
                'email' => $email,
            ]);

            $this->audit->write([
                'action' => 'sso_login',
                'target_user_id' => $user->id,
                'details' => ['email' => $email, 'nexus_sso_id' => $nexusSsoId, 'method' => 'nexus_sso'],
            ]);

            return $user;
        }

        $role = ($config['default_role'] ?? 'user') === 'admin' ? 'admin' : 'user';
        $now = SqlDate::now();

        $id = DB::table('users')->insertGetId([
            'email' => $email,
            'full_name' => $fullName,
            'password_hash' => Hash::make(IdGenerator::make()),
            'role' => $role,
            'is_approved' => true,
            'nexus_sso_id' => $nexusSsoId,
            'created_date' => $now,
            'updated_date' => $now,
        ]);

        $this->audit->write([
            'action' => 'sso_register',
            'target_user_id' => $id,
            'details' => ['email' => $email, 'nexus_sso_id' => $nexusSsoId, 'role' => $role],
        ]);

        return DB::table('users')->where('id', $id)->first();
    }
}
