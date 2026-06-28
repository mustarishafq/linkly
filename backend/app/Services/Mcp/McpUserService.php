<?php

namespace App\Services\Mcp;

use App\Services\JwtService;
use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class McpUserService
{
    public function __construct(private JwtService $jwt) {}

    public function list(
        ?string $search = null,
        ?string $sortBy = null,
        string $sortOrder = 'desc',
        int $page = 1,
        int $perPage = 50,
    ): array {
        $query = DB::table('users')
            ->select('id', 'email', 'full_name', 'role', 'is_approved', 'nexus_sso_id', 'created_date', 'updated_date');

        $search = trim((string) $search);
        if ($search !== '') {
            $pattern = '%'.$search.'%';
            $query->where(function ($q) use ($pattern) {
                $q->where('email', 'like', $pattern)
                    ->orWhere('full_name', 'like', $pattern)
                    ->orWhere('nexus_sso_id', 'like', $pattern);
            });
        }

        $sortField = in_array($sortBy, ['email', 'full_name', 'role', 'created_date', 'updated_date'], true)
            ? $sortBy
            : 'created_date';
        $query->orderBy($sortField, strtolower($sortOrder) === 'asc' ? 'asc' : 'desc');

        $total = (clone $query)->count();
        $lastPage = max(1, (int) ceil($total / max(1, $perPage)));
        $page = max(1, min($page, $lastPage));
        $offset = ($page - 1) * $perPage;

        $rows = $query->offset($offset)->limit($perPage)->get()
            ->map(function ($user) {
                $safe = $this->jwt->toSafeUser($user);

                return [
                    ...$safe,
                    'nexus_sso_id' => $user->nexus_sso_id ?: null,
                ];
            })
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
