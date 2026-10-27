<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

abstract class Controller
{
    /**
     * Pengguna yang sedang login (atau null) untuk endpoint PUBLIK yang tetap bisa
     * "sadar login", mis. GET /events menambahkan my_registration bila ada token valid.
     */
    protected function viewer(Request $request): ?User
    {
        if ($request->attributes->has('viewer')) {
            return $request->attributes->get('viewer');
        }

        $user = $request->user('sanctum');

        if ($user && ! $user->is_active) {
            $user = null;
        }

        $request->attributes->set('viewer', $user);

        return $user;
    }
}
