<?php

use App\Exceptions\ApiException;
use App\Http\Middleware\EnsureAccountActive;
use App\Http\Middleware\EnsureRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Alias dipakai di routes/api.php: ->middleware('role:admin'), ->middleware('active')
        $middleware->alias([
            'role' => EnsureRole::class,
            'active' => EnsureAccountActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Semua error di /api/* selalu dijawab JSON dengan bentuk yang konsisten:
        // { "success": false, "message": "...", "errors": { field: "pesan" } }
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );

        $exceptions->dontReport([ApiException::class]);

        // 422 — validasi. Frontend menampilkan SATU pesan per field (string, bukan array).
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'success' => false,
                'message' => 'The given data was invalid.',
                'errors' => collect($e->errors())->map(fn ($messages) => $messages[0])->all(),
            ], 422);
        });

        // 401 — token tidak ada / tidak valid / kedaluwarsa.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(['success' => false, 'message' => 'Unauthenticated.'], 401);
        });

        // 403 / 404 / 405 / 429 dst. (termasuk AuthorizationException dan ModelNotFoundException
        // yang sudah diubah Laravel menjadi HttpException sebelum sampai ke sini).
        $exceptions->render(function (HttpExceptionInterface $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $e->getStatusCode();
            $message = match (true) {
                $status === 403 => $e->getMessage() !== '' ? $e->getMessage() : 'You are not allowed to do this.',
                $status === 404 => 'Not found.',
                $status === 405 => 'Method not allowed.',
                $status === 429 => 'Too many requests. Please try again later.',
                default => $e->getMessage() !== '' ? $e->getMessage() : 'Request failed.',
            };

            return response()->json(['success' => false, 'message' => $message], $status, $e->getHeaders());
        });

        // 500 — jangan bocorkan detail error ke klien saat APP_DEBUG=false.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*') || config('app.debug')) {
                return null;
            }

            return response()->json(['success' => false, 'message' => 'Server error. Please try again later.'], 500);
        });
    })
    ->create();
