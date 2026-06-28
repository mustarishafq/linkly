<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Controllers\Controller;
use App\Support\McpResponse;
use Illuminate\Http\Request;

abstract class McpController extends Controller
{
    protected function actorUserId(Request $request): ?string
    {
        $user = $request->attributes->get('auth_user');

        return $user?->id ? (string) $user->id : null;
    }

    protected function requireAdmin(Request $request): ?\Illuminate\Http\JsonResponse
    {
        if ($request->attributes->get('mcp_auth_mode') === 'api_key') {
            return null;
        }

        $user = $request->attributes->get('auth_user');
        if (! $user || $user->role !== 'admin') {
            return McpResponse::error('Admin access required.', 403);
        }

        return null;
    }

    protected function perPage(Request $request): int
    {
        $max = (int) config('mcp.max_per_page', 200);
        $default = (int) config('mcp.default_per_page', 50);

        return min(max((int) $request->query('per_page', $default), 1), $max);
    }

    protected function page(Request $request): int
    {
        return max(1, (int) $request->query('page', 1));
    }
}
