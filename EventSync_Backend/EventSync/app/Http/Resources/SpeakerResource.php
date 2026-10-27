<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class SpeakerResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $s = $this->resource;

        return [
            'id' => $s->id,
            'event_id' => $s->event_id,
            'name' => $s->name,
            'title' => $s->title,
            'role' => $s->role,
            'topic' => $s->topic,
            'bio' => $s->bio,
            'photo' => $s->photo ?? '',
        ];
    }
}
