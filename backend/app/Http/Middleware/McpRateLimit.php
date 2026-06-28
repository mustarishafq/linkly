<?php

namespace App\Http\Middleware;

use App\Services\Mcp\McpSettingsService;
use App\Support\McpResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class McpRateLimit
{
    public function __construct(private McpSettingsService $mcpSettings) {}

    public function handle(Request $request, Closure $next): Response
    {
        $client = (string) $request->attributes->get('mcp_client', 'unknown');
        $settings = $this->mcpSettings->resolve();
        $limit = max(1, (int) $settings['rateLimit']);
        $cacheKey = 'mcp:'.hash('sha256', $client);

        $count = (int) Cache::get($cacheKey, 0);
        if ($count >= $limit) {
            return McpResponse::error('Too many requests. Please try again later.', 429);
        }

        Cache::put($cacheKey, $count + 1, now()->addMinute());

        return $next($request);
    }
}
