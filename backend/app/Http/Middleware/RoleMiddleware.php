<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string ...$roles): JsonResponse
    {
        $user = $request->user();

        if (! $user || empty($roles) || ! in_array($user->role, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not authorized to access this resource.',
                'data' => null,
            ], 403);
        }

        return $next($request);
    }
}
