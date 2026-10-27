<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;

class CategoryResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $c = $this->resource;

        $data = [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'description' => $c->description,
            'color' => $c->color,
        ];

        if (array_key_exists('events_count', $c->getAttributes())) {
            $data['events_count'] = (int) $c->events_count;
        }

        return $data;
    }
}
