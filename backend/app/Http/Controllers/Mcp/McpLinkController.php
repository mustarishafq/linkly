<?php

namespace App\Http\Controllers\Mcp;

use App\Http\Requests\Mcp\McpListRequest;
use App\Http\Requests\Mcp\McpStoreLinkRequest;
use App\Http\Requests\Mcp\McpUpdateLinkRequest;
use App\Services\LinkWebhookService;
use App\Services\Mcp\McpEntityService;
use App\Support\McpResponse;
use Illuminate\Http\JsonResponse;

class McpLinkController extends McpController
{
    public function __construct(
        private McpEntityService $entities,
        private LinkWebhookService $linkWebhooks,
    ) {}

    public function index(McpListRequest $request): JsonResponse
    {
        $result = $this->entities->list(
            'ShortLink',
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
        $record = $this->entities->find('ShortLink', $id);
        if (! $record) {
            return McpResponse::error('Resource not found.', 404);
        }

        return McpResponse::success($record);
    }

    public function store(McpStoreLinkRequest $request): JsonResponse
    {
        if ($denied = $this->requireWriteAccess($request)) {
            return $denied;
        }

        $record = $this->entities->create('ShortLink', $request->validated(), $this->actorUserId($request));
        if (! $record) {
            return McpResponse::error('Unable to create link.', 500);
        }

        $this->linkWebhooks->linkCreated($record, $this->actorUserId($request));

        return McpResponse::success($record, [], null, 201);
    }

    public function update(McpUpdateLinkRequest $request, string $id): JsonResponse
    {
        if ($denied = $this->requireWriteAccess($request)) {
            return $denied;
        }

        $updated = $this->entities->update('ShortLink', $id, $request->validated(), $this->actorUserId($request));
        if (! $updated) {
            return McpResponse::error('Resource not found.', 404);
        }

        $this->linkWebhooks->linkUpdated($updated, $this->actorUserId($request));

        return McpResponse::success($updated);
    }

    public function destroy(\Illuminate\Http\Request $request, string $id): JsonResponse
    {
        if ($denied = $this->requireWriteAccess($request)) {
            return $denied;
        }

        $existing = $this->entities->find('ShortLink', $id);
        if (! $existing) {
            return McpResponse::error('Resource not found.', 404);
        }

        $deleted = $this->entities->delete('ShortLink', $id, $this->actorUserId($request));
        $this->linkWebhooks->linkDeleted($existing, $this->actorUserId($request));

        return McpResponse::success($deleted);
    }

    private function requireWriteAccess(\Illuminate\Http\Request $request): ?JsonResponse
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
}
