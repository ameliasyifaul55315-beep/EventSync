<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tabel penghubung User <-> Event (relasi N:M dengan data tambahan: status & waktu daftar).
 */
class EventRegistration extends Model
{
    public const REGISTERED = 'registered';
    public const CANCELLED = 'cancelled';
    public const ATTENDED = 'attended';

    protected $table = 'event_registrations';

    protected $fillable = ['event_id', 'user_id', 'status', 'registered_at', 'cancelled_at'];

    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
