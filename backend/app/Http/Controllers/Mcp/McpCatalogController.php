<?php

namespace App\Http\Controllers\Mcp;

use App\Services\Mcp\McpCatalogService;
use App\Support\McpResponse;

class McpCatalogController extends McpController
{
    public function __construct(private McpCatalogService $catalog) {}

    public function index(): \Illuminate\Http\JsonResponse
    {
        return McpResponse::success($this->catalog->entries());
    }
}
