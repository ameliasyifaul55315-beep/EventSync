<?php

namespace App\Http\Middleware;

use App\Exceptions\ApiException;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Akun yang dinonaktifkan admin langsung ditolak walau token-nya masih valid. */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            throw new ApiException('Your account has been deactivated. Please contact an admin.', 403);
        }

        return $next($request);
    }
}
