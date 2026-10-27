<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Satu tabel `users` untuk tiga role: user (peserta), organizer, admin.
 *
 * Mass assignment: `role` dan `is_active` SENGAJA tidak ada di $fillable, sehingga tidak bisa
 * diisi dari request publik (mis. orang mendaftar sambil mengirim role=admin). Keduanya hanya
 * diubah lewat kode admin (Admin\UserController) atau seeder.
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory;

    public const ROLE_USER = 'user';
    public const ROLE_ORGANIZER = 'organizer';
    public const ROLE_ADMIN = 'admin';

    public const ROLES = [self::ROLE_USER, self::ROLE_ORGANIZER, self::ROLE_ADMIN];

    protected $fillable = ['name', 'email', 'password', 'phone', 'organization_name'];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            // "hashed": nilai plaintext otomatis di-hash (bcrypt) saat disimpan.
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === self::ROLE_ADMIN;
    }

    public function isOrganizer(): bool
    {
        return $this->role === self::ROLE_ORGANIZER;
    }

    public function isParticipant(): bool
    {
        return $this->role === self::ROLE_USER;
    }

    /** Event yang dibuat user ini (sebagai organizer). */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class, 'organizer_id');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }
}
