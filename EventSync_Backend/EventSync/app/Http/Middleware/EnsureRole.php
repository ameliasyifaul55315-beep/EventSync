<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pemakaian di route: ->middleware('role:admin') atau ->middleware('role:organizer,admin').
 * Dipasang SETELAH auth:sanctum. Ini otorisasi tingkat route; kepemilikan data diperiksa lagi di Policy.
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            throw new AuthenticationException();
        }

        if (! in_array($user->role, $roles, true)) {
            throw new ApiException('You are not allowed to do this.', 403);
        }

        return $next($request);
    }
}
