<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Requests\Mcp\McpListRequest;
use App\Services\Mcp\McpUserService;
use App\Support\McpResponse;
use Illuminate\Http\JsonResponse;

class McpUserController extends McpController
{
    public function __construct(private McpUserService $users) {}

    public function index(McpListRequest $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) {
            return $denied;
        }

        $result = $this->users->list(
            $request->input('search'),
            $request->input('sort_by'),
            $request->input('sort_order', 'desc'),
            $this->page($request),
            $this->perPage($request),
        );

        return McpResponse::success($result['data'], $result['meta']);
    }
}
