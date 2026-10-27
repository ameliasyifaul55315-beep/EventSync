<?php

return [

    'defaults' => [
        'guard' => env('AUTH_GUARD', 'web'),
    ],

    // Guard "web" dibutuhkan Sanctum sebagai guard dasar. Autentikasi API memakai
    // guard "sanctum" (Bearer token), lihat routes/api.php -> middleware('auth:sanctum').
    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],
    ],

    'providers' => [
        'users' => [
            'driver' => 'eloquent',
            'model' => env('AUTH_MODEL', App\Models\User::class),
        ],
    ],

    'password_timeout' => env('AUTH_PASSWORD_TIMEOUT', 10800),

];
