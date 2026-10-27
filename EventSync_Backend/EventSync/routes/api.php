<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CommitteeController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\Organizer;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\RegistrationController;
use App\Http\Controllers\Api\ScheduleController;
use App\Http\Controllers\Api\SpeakerController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| EventSync API  (prefix otomatis: /api)
|--------------------------------------------------------------------------
| Daftar endpoint ini = kontrak yang dipakai js/api.js di frontend.
| Lapisan keamanan, dari luar ke dalam:
|   auth:sanctum  -> harus login (Bearer token)
|   active        -> akun tidak dinonaktifkan
|   role:...      -> role yang diizinkan untuk grup route ini
|   Policy        -> di dalam controller: apakah event ini milik dia?
*/

// ---------- Publik ----------
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:auth');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:auth');
});

Route::get('categories', [CategoryController::class, 'index']);
Route::get('events', [EventController::class, 'index']);
Route::get('events/{key}', [EventController::class, 'show']);   // id atau slug
Route::get('schedules', [CatalogController::class, 'schedules']);
Route::get('speakers', [CatalogController::class, 'speakers']);

// ---------- Harus login (semua role) ----------
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::put('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'password']);

    // ---------- User / peserta ----------
    Route::middleware('role:user')->group(function () {
        Route::post('events/{id}/register', [RegistrationController::class, 'store']);
        Route::delete('events/{id}/register', [RegistrationController::class, 'destroy']);
        Route::get('my-events', [RegistrationController::class, 'myEvents']);
    });

    // ---------- Organizer (event miliknya) ----------
    Route::prefix('organizer')->middleware('role:organizer')->group(function () {
        Route::get('dashboard', [Organizer\EventController::class, 'dashboard']);
        Route::get('events', [Organizer\EventController::class, 'index']);
        Route::post('events', [Organizer\EventController::class, 'store']);
        Route::get('events/{id}', [Organizer\EventController::class, 'show']);
        Route::put('events/{id}', [Organizer\EventController::class, 'update']);
        Route::delete('events/{id}', [Organizer\EventController::class, 'destroy']);
        Route::post('events/{id}/submit', [Organizer\EventController::class, 'submit']);
        Route::get('participants', [Organizer\ParticipantController::class, 'index']);
    });

    // ---------- Organizer pemilik event ATAU admin (moderasi) ----------
    Route::middleware('role:organizer,admin')->group(function () {
        Route::post('events/{id}/cancel', [Organizer\EventController::class, 'cancel']);
        Route::get('events/{id}/participants', [Organizer\ParticipantController::class, 'forEvent']);

        foreach (['schedules' => ScheduleController::class, 'speakers' => SpeakerController::class, 'committees' => CommitteeController::class] as $path => $controller) {
            Route::get("events/{id}/{$path}", [$controller, 'index']);
            Route::post("events/{id}/{$path}", [$controller, 'store']);
            Route::put("events/{id}/{$path}/{rid}", [$controller, 'update']);
            Route::delete("events/{id}/{$path}/{rid}", [$controller, 'destroy']);
        }
    });

    // ---------- Admin ----------
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('dashboard', [Admin\DashboardController::class, 'index']);

        Route::get('users', [Admin\UserController::class, 'index']);
        Route::post('users', [Admin\UserController::class, 'store']);
        Route::put('users/{id}', [Admin\UserController::class, 'update']);
        Route::post('users/{id}/toggle', [Admin\UserController::class, 'toggle']);
        Route::delete('users/{id}', [Admin\UserController::class, 'destroy']);
        Route::get('organizers', [Admin\UserController::class, 'organizers']);

        Route::post('categories', [Admin\CategoryController::class, 'store']);
        Route::put('categories/{id}', [Admin\CategoryController::class, 'update']);
        Route::delete('categories/{id}', [Admin\CategoryController::class, 'destroy']);

        Route::get('events', [Admin\EventController::class, 'index']);
        Route::put('events/{id}', [Admin\EventController::class, 'update']);
        Route::delete('events/{id}', [Admin\EventController::class, 'destroy']);
        Route::post('events/{id}/approve', [Admin\EventController::class, 'approve']);
        Route::post('events/{id}/reject', [Admin\EventController::class, 'reject']);
    });
});
