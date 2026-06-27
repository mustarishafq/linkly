<?php

namespace App\Http\Middleware;

use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OptionalJwtAuth
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->jwt->readBearerToken($request->header('Authorization'));

        if ($token) {
            $payload = $this->jwt->verify($token);
            if ($payload && ! empty($payload['sub'])) {
                $user = $this->jwt->findApprovedUserById((string) $payload['sub']);
                if ($user && $user->is_approved) {
                    $request->attributes->set('auth_user', $user);
                }
            }
        }

        return $next($request);
    }
}
