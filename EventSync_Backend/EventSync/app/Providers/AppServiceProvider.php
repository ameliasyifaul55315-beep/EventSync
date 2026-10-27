<?php

namespace App\Providers;

use App\Models\Event;
use App\Policies\EventPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Event::class, EventPolicy::class);

        // Parameter {id} selalu angka, sehingga /events/{key} (id atau slug) tidak bentrok
        // dengan /events/{id}/register dan sejenisnya.
        Route::pattern('id', '[0-9]+');
        Route::pattern('rid', '[0-9]+');

        // Batasi percobaan login/register: 10 per menit per IP + email (anti brute force).
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip().'|'.strtolower((string) $request->input('email')));
        });
    }
}
