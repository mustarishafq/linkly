<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Requests\Mcp\McpListRequest;
use App\Services\Mcp\McpEntityService;
use App\Support\McpResponse;
use Illuminate\Http\JsonResponse;

class McpCampaignController extends McpController
{
    public function __construct(private McpEntityService $entities) {}

    public function index(McpListRequest $request): JsonResponse
    {
        $result = $this->entities->list(
            'Campaign',
            $request->input('search'),
            $request->input('sort_by'),
            $request->input('sort_order', 'desc'),
            $this->page($request),
            $this->perPage($request),
        );

        return McpResponse::success($result['data'], $result['meta']);
    }

    public function show(string $id): JsonResponse
    {
        $record = $this->entities->find('Campaign', $id);
        if (! $record) {
            return McpResponse::error('Resource not found.', 404);
        }

        return McpResponse::success($record);
    }
}
