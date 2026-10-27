<?php

namespace App\Http\Resources;

use App\Support\Dt;
use Illuminate\Http\Request;

/** Satu baris pendaftaran. Untuk My Events (dengan event) dan daftar peserta (dengan user + event ringkas). */
class RegistrationResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $r = $this->resource;

        $data = [
            'id' => $r->id,
            'user_id' => $r->user_id,
            'event_id' => $r->event_id,
            'status' => $r->status,
            'registered_at' => Dt::iso($r->registered_at),
            'cancelled_at' => Dt::iso($r->cancelled_at),
        ];

        if ($r->relationLoaded('user') && $r->user) {
            $data['user'] = ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email];
        }

        if ($r->relationLoaded('event') && $r->event) {
            $data['event'] = ['id' => $r->event->id, 'title' => $r->event->title];   // ringkas; My Events menimpanya dengan event lengkap
        }

        return $data;
    }
}
