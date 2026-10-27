<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Event;
use App\Models\User;
use App\Support\Api;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Kelola akun (admin saja): admin/users.html dan admin/organizers.html (tabel yang sama, role berbeda).
 * Inilah SATU-SATUNYA cara membuat akun organizer / admin — registrasi publik selalu role "user".
 */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->withCount('events as events_count');

        if ($request->filled('role') && in_array($request->query('role'), User::ROLES, true)) {
            $query->where('role', $request->query('role'));
        }

        if (($q = trim((string) $request->query('q'))) !== '') {
            $like = Sql::contains($q);
            $query->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like));
        }

        return Api::ok('Users retrieved successfully', UserResource::list($query->orderBy('id')->get(), $request));
    }

    public function organizers(Request $request): JsonResponse
    {
        $users = User::query()->withCount('events as events_count')
            ->where('role', User::ROLE_ORGANIZER)->orderBy('id')->get();

        return Api::ok('Organizers retrieved successfully', UserResource::list($users, $request));
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'role' => ['required', Rule::in(User::ROLES)],
            'organization_name' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'max:72'],
        ], ['email.unique' => 'This email is already registered.']);

        $user = new User([
            'name' => trim($data['name']),
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'organization_name' => $data['organization_name'] ?? null,
        ]);
        $user->role = $data['role'];        // role hanya boleh diset di sini (admin), bukan lewat mass assignment
        $user->is_active = true;
        $user->save();

        return Api::created('User created.', UserResource::one($user, $request));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::query()->find($id) ?? throw new ApiException('User not found.', 404);

        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:100'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(User::ROLES)],
            'organization_name' => ['nullable', 'string', 'max:150'],
            'password' => ['nullable', 'string', 'min:8', 'max:72'],
        ], ['email.unique' => 'This email is already registered.']);

        if ($user->id === $request->user()->id && $data['role'] !== User::ROLE_ADMIN) {
            throw new ApiException('You cannot remove your own admin role.', 422);
        }

        // Organizer yang masih memiliki event (termasuk yang di-soft-delete) tidak boleh diturunkan rolenya:
        // events.organizer_id harus tetap menunjuk ke akun organizer.
        if ($user->role === User::ROLE_ORGANIZER && $data['role'] !== User::ROLE_ORGANIZER
            && Event::withTrashed()->where('organizer_id', $user->id)->exists()) {
            throw new ApiException('This organizer still owns events, so the role cannot be changed.', 422);
        }

        $user->name = trim($data['name']);
        $user->email = $data['email'];
        $user->role = $data['role'];
        $user->organization_name = $data['organization_name'] ?? null;

        if (! empty($data['password'])) {
            $user->password = $data['password'];
            $user->tokens()->delete();         // password diganti admin -> semua sesi lama keluar
        }

        $user->save();

        return Api::ok('User updated.', UserResource::one($user, $request));
    }

    /** Aktif <-> nonaktif. Akun nonaktif tidak bisa login dan token-nya dicabut. */
    public function toggle(Request $request, string $id): JsonResponse
    {
        $user = User::query()->find($id) ?? throw new ApiException('User not found.', 404);

        if ($user->id === $request->user()->id) {
            throw new ApiException('You cannot deactivate your own account.', 422);
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        if (! $user->is_active) {
            $user->tokens()->delete();
        }

        return Api::ok($user->is_active ? 'Account activated.' : 'Account deactivated.', UserResource::one($user, $request));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::query()->find($id) ?? throw new ApiException('User not found.', 404);

        if ($user->id === $request->user()->id) {
            throw new ApiException('You cannot delete your own account.', 422);
        }

        // events.organizer_id = RESTRICT (juga untuk event yang sudah di-soft-delete).
        if (Event::withTrashed()->where('organizer_id', $user->id)->exists()) {
            throw new ApiException('This user still owns events. Deactivate the account instead.', 422);
        }

        $user->tokens()->delete();
        $user->delete();                       // pendaftaran user ikut terhapus (FK CASCADE)

        return Api::ok('User deleted.');
    }
}
