<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class LogMcpRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $requestId = (string) Str::uuid();
        $request->attributes->set('mcp_request_id', $requestId);
        $startedAt = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        Log::info('mcp.request', [
            'request_id' => $requestId,
            'endpoint' => $request->method().' '.$request->path(),
            'client' => $request->attributes->get('mcp_client'),
            'auth_mode' => $request->attributes->get('mcp_auth_mode'),
            'status' => $response->getStatusCode(),
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
        ]);

        return $response;
    }
}
