<?php

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Same file registered twice: some stacks resolve the path as `api/v1/v1/...`, others as `v1/v1/...`
            // (reverse proxies, PHP built-in server, etc.). Both must match so the API works everywhere.
            $apiRoutes = base_path('routes/api.php');
            Route::middleware('api')->prefix('api/v1/v1')->group($apiRoutes);
            Route::middleware('api')->prefix('v1/v1')->group($apiRoutes);
        },
    )
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('notifications:prune-expired-reads')->hourly();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        /**
         * Laravel’s default API 500 in production is `{"message":"Server Error"}` (no details).
         * Expose a consistent JSON envelope; include exception text when APP_DEBUG is true.
         */
        $exceptions->renderable(function (\Throwable $e, Request $request) {
            $path = (string) $request->path();
            if (! str_starts_with($path, 'api/') && ! str_starts_with($path, 'v1/')) {
                return null;
            }
            if (! $request->expectsJson() && ! str_contains((string) $request->header('Accept', ''), 'application/json')) {
                return null;
            }
            if ($e instanceof \Illuminate\Validation\ValidationException) {
                return null;
            }
            if ($e instanceof \Illuminate\Auth\AuthenticationException) {
                return null;
            }
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\HttpException) {
                // abort(4xx/5xx), 503, maintenance — keep Laravel’s status/body
                return null;
            }
            if ($e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                return null;
            }
            if ($e instanceof \Symfony\Component\HttpKernel\Exception\NotFoundHttpException) {
                return null;
            }

            $message = 'Server error. Please try again in a moment.';
            if (config('app.debug')) {
                $message = $e->getMessage().' ('.basename($e->getFile()).':'.$e->getLine().')';
            }

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
            ], 500);
        });

        // 500/HTML error responses skip the normal CORS middleware; browsers then report a CORS failure.
        $exceptions->respond(function (Response $response, \Throwable $e, Request $request) {
            $path = $request->path();
            if (! str_starts_with($path, 'api/') && ! str_starts_with($path, 'v1/')) {
                return $response;
            }
            $origin = $request->headers->get('Origin');
            if (! $origin) {
                return $response;
            }
            $vary = static function (Response $r) use ($origin, $request): void {
                $r->headers->set('Access-Control-Allow-Origin', $origin);
                if (config('cors.supports_credentials')) {
                    $r->headers->set('Access-Control-Allow-Credentials', 'true');
                }
                $h = $request->headers->get('Access-Control-Request-Headers');
                $r->headers->set(
                    'Access-Control-Allow-Headers',
                    $h ?: 'Content-Type, Authorization, Accept, X-Requested-With, X-XSRF-TOKEN',
                );
                $r->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                $r->headers->set('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
            };

            if (in_array($origin, config('cors.allowed_origins', []), true)) {
                $vary($response);

                return $response;
            }
            foreach (config('cors.allowed_origins_patterns', []) as $pattern) {
                if (is_string($pattern) && @preg_match($pattern, $origin)) {
                    $vary($response);

                    return $response;
                }
            }

            return $response;
        });
    })->create();
