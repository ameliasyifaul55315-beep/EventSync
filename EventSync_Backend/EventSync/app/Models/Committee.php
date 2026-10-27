<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Panitia sebuah event (tabel event_committees). */
class Committee extends Model
{
    protected $table = 'event_committees';

    protected $fillable = ['name', 'role', 'organization', 'contact'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }
}
