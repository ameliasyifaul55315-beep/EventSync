<?php

return [

    // Tidak dipakai (kita memakai Bearer token, bukan SPA cookie).
    'stateful' => [],

    'guard' => ['web'],

    // Masa berlaku token dalam MENIT. Default 7 hari. null = tidak pernah kedaluwarsa (tidak disarankan).
    'expiration' => env('SANCTUM_TOKEN_EXPIRATION', 60 * 24 * 7),

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];
