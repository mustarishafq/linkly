<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuth
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->jwt->readBearerToken($request->header('Authorization'));
        if (! $token) {
            return response()->json(['code' => 'auth_required', 'message' => 'Authentication required'], 401);
        }

        $payload = $this->jwt->verify($token);
        if (! $payload || empty($payload['sub'])) {
            return response()->json(['code' => 'auth_required', 'message' => 'Invalid token'], 401);
        }

        $user = $this->jwt->findApprovedUserById((string) $payload['sub']);
        if (! $user) {
            return response()->json(['code' => 'auth_required', 'message' => 'Invalid token'], 401);
        }

        if (! $user->is_approved) {
            return response()->json(['code' => 'pending_approval', 'message' => 'Account pending admin approval'], 403);
        }

        $request->attributes->set('auth_user', $user);

        return $next($request);
    }
}
