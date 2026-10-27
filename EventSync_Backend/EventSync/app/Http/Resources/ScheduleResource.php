<?php

namespace App\Http\Resources;

use App\Support\Dt;
use Illuminate\Http\Request;

class ScheduleResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $s = $this->resource;

        $data = [
            'id' => $s->id,
            'event_id' => $s->event_id,
            'speaker_id' => $s->speaker_id,
            'session_name' => $s->session_name,
            'title' => $s->title,
            'description' => $s->description,
            'location' => $s->location,
            'person_in_charge' => $s->person_in_charge,
            'start_at' => Dt::iso($s->start_at),
            'end_at' => Dt::iso($s->end_at),
            'sort_order' => $s->sort_order,
        ];

        if ($s->relationLoaded('speaker')) {
            $data['speaker'] = $s->speaker ? SpeakerResource::one($s->speaker, $request) : null;
        }

        return $data;
    }
}
