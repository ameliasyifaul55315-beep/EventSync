<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Bentuk respons JSON yang konsisten untuk seluruh API:
 *   { "success": true, "message": "...", "data": ..., ...extra }
 * "extra" dipakai untuk kunci tambahan yang dibaca frontend, mis. "meta" (paginasi) dan "token".
 */
final class Api
{
    public static function ok(string $message = 'OK', mixed $data = null, array $extra = [], int $status = 200): JsonResponse
    {
        $body = ['success' => true, 'message' => $message];

        if ($data !== null) {
            $body['data'] = $data;
        }

        return response()->json($body + $extra, $status);
    }

    public static function created(string $message, mixed $data = null, array $extra = []): JsonResponse
    {
        return self::ok($message, $data, $extra, 201);
    }
}
