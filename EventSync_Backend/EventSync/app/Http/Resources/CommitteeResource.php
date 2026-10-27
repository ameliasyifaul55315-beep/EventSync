<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CommitteeResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $c = $this->resource;

        return [
            'id' => $c->id,
            'event_id' => $c->event_id,
            'name' => $c->name,
            'role' => $c->role,
            'organization' => $c->organization,
            'contact' => $c->contact,
        ];
    }
}
