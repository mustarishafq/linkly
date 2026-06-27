<?php

namespace App\Http\Controllers;

use App\Services\AuditLogService;
use App\Services\JwtService;
use App\Support\SqlDate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function __construct(
        private JwtService $jwt,
        private AuditLogService $audit,
    ) {}

    public function users(): JsonResponse
    {
        $users = DB::table('users')
            ->select('id', 'email', 'full_name', 'role', 'is_approved', 'created_date', 'updated_date')
            ->orderByDesc('created_date')
            ->get()
            ->map(fn ($user) => $this->jwt->toSafeUser($user))
            ->all();

        return response()->json($users);
    }

    public function updateApproval(Request $request, string $id): JsonResponse
    {
        $isApproved = (bool) $request->input('is_approved');
        $target = DB::table('users')->where('id', $id)->first();

        if (! $target) {
            return $this->error('not_found', 'User not found', 404);
        }

        DB::table('users')->where('id', $id)->update([
            'is_approved' => $isApproved,
            'updated_date' => SqlDate::now(),
        ]);

        $actor = $request->attributes->get('auth_user');
        $this->audit->write([
            'actor_user_id' => $actor?->id,
            'action' => $isApproved ? 'user_approved' : 'user_approval_revoked',
            'target_user_id' => $id,
            'details' => [
                'email' => $target->email,
                'full_name' => $target->full_name,
                'previous_approved' => (bool) $target->is_approved,
                'is_approved' => $isApproved,
            ],
        ]);

        return response()->json(['ok' => true]);
    }

    public function updateRole(Request $request, string $id): JsonResponse
    {
        $role = $request->input('role') === 'admin' ? 'admin' : 'user';
        $target = DB::table('users')->where('id', $id)->first();

        if (! $target) {
            return $this->error('not_found', 'User not found', 404);
        }

        DB::table('users')->where('id', $id)->update([
            'role' => $role,
            'updated_date' => SqlDate::now(),
        ]);

        $actor = $request->attributes->get('auth_user');
        $this->audit->write([
            'actor_user_id' => $actor?->id,
            'action' => 'user_role_changed',
            'target_user_id' => $id,
            'details' => [
                'email' => $target->email,
                'full_name' => $target->full_name,
                'previous_role' => $target->role,
                'role' => $role,
            ],
        ]);

        return response()->json(['ok' => true]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $limit = min(max((int) $request->query('limit', 100), 1), 500);
        $action = trim((string) $request->query('action', ''));
        $search = trim((string) $request->query('search', ''));
        $from = trim((string) $request->query('from', ''));
        $to = trim((string) $request->query('to', ''));

        $query = DB::table('audit_logs')->orderByDesc('created_date');

        if ($action !== '') {
            $query->where('action', $action);
        }
        if ($from !== '') {
            $query->where('created_date', '>=', $from);
        }
        if ($to !== '') {
            $query->where('created_date', '<=', $to);
        }
        if ($search !== '') {
            $pattern = "%{$search}%";
            $query->where(function ($q) use ($pattern) {
                $q->where('actor_user_id', 'like', $pattern)
                    ->orWhere('target_user_id', 'like', $pattern)
                    ->orWhere('action', 'like', $pattern)
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.email')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.full_name')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.nexus_sso_id')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.scope')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.entity')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.entity_id')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.label')) LIKE ?", [$pattern]);
            });
        }

        $rows = $query->limit($limit)->get();

        $userIds = $rows
            ->flatMap(fn ($row) => [$row->actor_user_id, $row->target_user_id])
            ->filter()
            ->unique()
            ->values()
            ->all();

        $userMap = collect();
        if ($userIds) {
            $userMap = DB::table('users')
                ->select('id', 'full_name', 'email')
                ->whereIn('id', $userIds)
                ->get()
                ->keyBy('id');
        }

        $normalized = $rows->map(function ($row) use ($userMap) {
            $details = is_string($row->details) ? json_decode($row->details, true) : (array) $row->details;
            $actor = $row->actor_user_id ? $userMap->get($row->actor_user_id) : null;
            $target = $row->target_user_id ? $userMap->get($row->target_user_id) : null;

            return [
                'id' => $row->id,
                'actor_user_id' => $row->actor_user_id,
                'action' => $row->action,
                'target_user_id' => $row->target_user_id,
                'details' => $details,
                'created_date' => SqlDate::toIso8601($row->created_date),
                'actor_label' => $actor?->full_name ?: $actor?->email ?: ($row->actor_user_id ?: 'system'),
                'target_label' => $target?->full_name ?: $target?->email ?: ($row->target_user_id ?: '-'),
            ];
        })->all();

        $actionCounts = collect($normalized)
            ->groupBy('action')
            ->map(fn ($group) => $group->count())
            ->all();

        return response()->json([
            'timezone' => config('linkly.timezone'),
            'logs' => $normalized,
            'stats' => [
                'total' => count($normalized),
                'action_counts' => $actionCounts,
            ],
        ]);
    }
}
