<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource = "bentuk JSON" sebuah model. Frontend (api.js) mengharapkan bentuk tertentu,
 * jadi setiap resource di sini meniru persis objek yang dulu dibuat "server tiruan" di api.js.
 *
 *   EventResource::one($event)      -> array satu event
 *   EventResource::list($events)    -> array daftar event
 */
abstract class BaseResource extends JsonResource
{
    public static function one(mixed $model, ?Request $request = null): array
    {
        return (new static($model))->resolve($request ?? request());
    }

    public static function list(iterable $models, ?Request $request = null): array
    {
        $request ??= request();
        $out = [];

        foreach ($models as $model) {
            $out[] = (new static($model))->resolve($request);
        }

        return $out;
    }
}
