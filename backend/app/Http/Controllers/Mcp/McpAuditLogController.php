<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Requests\Mcp\McpListRequest;
use App\Services\Mcp\McpAuditLogService;
use App\Support\McpResponse;
use Illuminate\Http\JsonResponse;

class McpAuditLogController extends McpController
{
    public function __construct(private McpAuditLogService $auditLogs) {}

    public function index(McpListRequest $request): JsonResponse
    {
        if ($denied = $this->requireAdmin($request)) {
            return $denied;
        }

        $result = $this->auditLogs->list(
            $request->input('search'),
            $request->input('action'),
            $this->page($request),
            $this->perPage($request),
        );

        return McpResponse::success($result['data'], $result['meta']);
    }
}
