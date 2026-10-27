<?php

use Illuminate\Support\Facades\Route;

/*
| Frontend EventSync adalah file statis di folder public/ (index.html, pages/*.html, css/, js/, assets/).
| Web server menyajikannya langsung; route di bawah hanya memastikan "/" membuka halaman Home
| saat dijalankan dengan `php artisan serve`.
*/
Route::get('/', fn () => response()->file(public_path('index.html')));
