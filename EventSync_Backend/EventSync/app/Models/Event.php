<?php

namespace App\Models;

use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory, SoftDeletes;

    public const DRAFT = 'draft';
    public const PENDING = 'pending_review';
    public const APPROVED = 'approved';     // = "published": tampil untuk publik
    public const REJECTED = 'rejected';
    public const CANCELLED = 'cancelled';

    public const STATUSES = [self::DRAFT, self::PENDING, self::APPROVED, self::REJECTED, self::CANCELLED];

    public const DEFAULT_POSTER = 'assets/images/poster-tech-innovation-day-2026.svg';

    // Hanya field isi event yang boleh di-mass-assign. organizer_id, slug, status, is_featured dan
    // field review diisi oleh kode server, tidak pernah dari request.
    protected $fillable = [
        'category_id', 'title', 'description', 'location',
        'start_at', 'end_at', 'capacity', 'poster_path',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'end_at' => 'datetime',
            'submitted_at' => 'datetime',
            'reviewed_at' => 'datetime',
            'capacity' => 'integer',
            'is_featured' => 'boolean',
        ];
    }

    /* ---------- relasi ---------- */

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class)->orderBy('start_at')->orderBy('sort_order');
    }

    public function speakers(): HasMany
    {
        return $this->hasMany(Speaker::class);
    }

    public function committees(): HasMany
    {
        return $this->hasMany(Committee::class);
    }

    /* ---------- scope ---------- */

    /** Event yang terlihat publik (status approved; yang di-soft-delete otomatis tersingkir). */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', self::APPROVED);
    }

    /** Tambahkan kolom registered_count = pendaftar aktif (registered + attended, tidak termasuk cancelled). */
    public function scopeWithRegisteredCount(Builder $query): Builder
    {
        return $query->withCount([
            'registrations as registered_count' => fn ($q) => $q->where('status', '!=', EventRegistration::CANCELLED),
        ]);
    }

    /* ---------- aturan bisnis ---------- */

    /** Upcoming / ongoing / completed — dihitung dari tanggal, hanya untuk event approved. */
    public function lifecycle(): ?string
    {
        if ($this->status !== self::APPROVED) {
            return null;
        }

        $now = now();

        return match (true) {
            $now->lt($this->start_at) => 'upcoming',
            $now->lte($this->end_at) => 'ongoing',
            default => 'completed',
        };
    }

    public function hasStarted(): bool
    {
        return now()->gte($this->start_at);
    }

    public function activeRegistrationsCount(): int
    {
        return $this->registrations()->where('status', '!=', EventRegistration::CANCELLED)->count();
    }

    /** Slug unik dari judul. Slug bersifat unik juga terhadap event yang sudah di-soft-delete. */
    public static function uniqueSlug(string $title, ?int $ignoreId = null): string
    {
        $base = Str::slug($title) ?: 'event';
        $slug = $base;
        $i = 2;

        while (static::withTrashed()->where('slug', $slug)->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
