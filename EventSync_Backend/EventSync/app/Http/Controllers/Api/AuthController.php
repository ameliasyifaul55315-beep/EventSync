<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Register / Login / Logout / Me.  Dipakai halaman: login.html, register.html, dan semua halaman
 * lewat Auth.* di js/auth.js.  Tabel: users, personal_access_tokens.
 */
class AuthController extends Controller
{
    /** Hash palsu agar waktu respons login tetap sama walau email tidak terdaftar (anti user-enumeration). */
    private const DUMMY_HASH = '$2y$12$YrqnI0Re68REJ0PxdIrqiOvVhf11YqFc0b/5f16nz0d.xfTf7B4Bi';

    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        // Hanya name/email/password yang diterima. Field "role" dari request DIABAIKAN:
        // registrasi publik selalu menghasilkan role = user.
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed'],
        ], [
            'email.unique' => 'This email is already registered.',
        ]);

        $user = new User([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'password' => $data['password'],   // di-hash otomatis oleh cast "hashed"
        ]);
        $user->role = User::ROLE_USER;
        $user->is_active = true;
        $user->save();

        return Api::created('Registration successful. Please log in.', null, ['user' => UserResource::one($user)]);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::query()->where('email', Str::lower(trim($data['email'])))->first();

        $passwordOk = Hash::check($data['password'], $user?->password ?? self::DUMMY_HASH);

        if (! $user || ! $passwordOk) {
            throw ValidationException::withMessages(['email' => 'These credentials do not match our records.']);
        }

        if (! $user->is_active) {
            throw new ApiException('Your account has been deactivated. Please contact an admin.', 403);
        }

        $token = $user->createToken('eventsync-web')->plainTextToken;

        // "token" dan "user" di level atas karena itulah yang dibaca Auth.login() di frontend.
        return Api::ok('Login successful.', null, ['token' => $token, 'user' => UserResource::one($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();   // token ini langsung tidak berlaku lagi
        }

        return Api::ok('Logged out.');
    }

    public function me(Request $request): JsonResponse
    {
        return Api::ok('OK', UserResource::one($request->user()));
    }
}
