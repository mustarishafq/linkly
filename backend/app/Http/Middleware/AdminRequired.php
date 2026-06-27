<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminRequired
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->attributes->get('auth_user');

        if (! $user || $user->role !== 'admin') {
            return response()->json(['code' => 'forbidden', 'message' => 'Admin access required'], 403);
        }

        return $next($request);
    }
}
