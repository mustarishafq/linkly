<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use App\Services\Mcp\McpSettingsService;
use App\Support\McpResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateMcpClient
{
    public function __construct(
        private McpSettingsService $mcpSettings,
        private JwtService $jwt,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = trim((string) $request->header('X-API-Key', ''));
        $settings = $this->mcpSettings->resolve();

        if ($apiKey !== '' && in_array($apiKey, $settings['apiKeys'], true)) {
            $request->attributes->set('mcp_auth_mode', 'api_key');
            $request->attributes->set('mcp_client', $apiKey);

            return $next($request);
        }

        $token = $this->jwt->readBearerToken($request->header('Authorization'));
        if ($token) {
            $payload = $this->jwt->verify($token);
            if ($payload && ! empty($payload['sub'])) {
                $user = $this->jwt->findApprovedUserById((string) $payload['sub']);
                if ($user && $user->is_approved) {
                    $request->attributes->set('auth_user', $user);
                    $request->attributes->set('mcp_auth_mode', 'bearer');
                    $request->attributes->set('mcp_client', (string) ($user->email ?: $user->id));

                    return $next($request);
                }
            }
        }

        return McpResponse::error('Invalid or missing credentials.', 401);
    }
}
