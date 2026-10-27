<?php

namespace App\Models;

use Database\Factories\SpeakerFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Speaker extends Model
{
    /** @use HasFactory<SpeakerFactory> */
    use HasFactory;

    protected $fillable = ['name', 'title', 'role', 'topic', 'bio', 'photo'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class);
    }
}
