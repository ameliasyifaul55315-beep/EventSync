<?php

namespace App\Http\Resources;

use App\Support\Dt;
use Illuminate\Http\Request;

class UserResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $u = $this->resource;

        $data = [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'phone' => $u->phone,
            'organization_name' => $u->organization_name,
            'is_active' => (bool) $u->is_active,
            'created_at' => Dt::iso($u->created_at),
        ];

        // Hanya ada bila query memakai withCount('events as events_count') (halaman admin).
        if (array_key_exists('events_count', $u->getAttributes())) {
            $data['events_count'] = (int) $u->events_count;
        }

        return $data;   // password TIDAK PERNAH ikut
    }
}
