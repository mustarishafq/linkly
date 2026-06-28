<?php

namespace App\Services\Mcp;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class McpAuditLogService
{
    public function list(
        ?string $search = null,
        ?string $action = null,
        int $page = 1,
        int $perPage = 50,
    ): array {
        $query = DB::table('audit_logs')->orderByDesc('created_date');

        $action = trim((string) $action);
        if ($action !== '') {
            $query->where('action', $action);
        }

        $search = trim((string) $search);
        if ($search !== '') {
            $pattern = '%'.$search.'%';
            $query->where(function ($q) use ($pattern) {
                $q->where('actor_user_id', 'like', $pattern)
                    ->orWhere('target_user_id', 'like', $pattern)
                    ->orWhere('action', 'like', $pattern)
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.email')) LIKE ?", [$pattern])
                    ->orWhereRaw("JSON_UNQUOTE(JSON_EXTRACT(details, '$.entity')) LIKE ?", [$pattern]);
            });
        }

        $total = (clone $query)->count();
        $lastPage = max(1, (int) ceil($total / max(1, $perPage)));
        $page = max(1, min($page, $lastPage));
        $offset = ($page - 1) * $perPage;

        $rows = $query->offset($offset)->limit($perPage)->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'actor_user_id' => $row->actor_user_id,
                'action' => $row->action,
                'target_user_id' => $row->target_user_id,
                'details' => is_string($row->details) ? json_decode($row->details, true) : (array) $row->details,
                'created_date' => SqlDate::toIso8601($row->created_date),
            ])
            ->all();

        return [
            'data' => $rows,
            'meta' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }
}
