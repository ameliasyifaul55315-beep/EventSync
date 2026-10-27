<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\CommitteeResource;
use App\Models\Committee;
use App\Models\Event;
use Illuminate\Database\Eloquent\Model;

/** Panitia event. Halaman: organizer/speakers.html (tab Committee). Tabel: event_committees. */
class CommitteeController extends EventChildController
{
    protected function model(): string
    {
        return Committee::class;
    }

    protected function resource(): string
    {
        return CommitteeResource::class;
    }

    protected function rules(Event $event): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'role' => ['required', 'string', 'max:60'],
            'organization' => ['nullable', 'string', 'max:120'],
            'contact' => ['nullable', 'string', 'max:150'],
        ];
    }

    protected function attributes(array $data, ?Model $current): array
    {
        return [
            'name' => trim($data['name']),
            'role' => trim($data['role']),
            'organization' => $data['organization'] ?? null,
            'contact' => $data['contact'] ?? null,
        ];
    }
}
