<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\SpeakerResource;
use App\Models\Event;
use App\Models\Speaker;
use App\Services\ImageStorage;
use Illuminate\Database\Eloquent\Model;

/** Speaker / mentor / juri. Halaman: organizer/speakers.html (tab Speakers). Tabel: speakers (N:1 ke events). */
class SpeakerController extends EventChildController
{
    public function __construct(private readonly ImageStorage $images)
    {
    }

    protected function model(): string
    {
        return Speaker::class;
    }

    protected function resource(): string
    {
        return SpeakerResource::class;
    }

    protected function rules(Event $event): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'title' => ['nullable', 'string', 'max:120'],
            'role' => ['required', 'string', 'max:60'],
            'topic' => ['nullable', 'string', 'max:150'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'photo' => ['nullable', 'string'],
        ];
    }

    protected function attributes(array $data, ?Model $current): array
    {
        $photo = $this->images->resolve($data['photo'] ?? null, 'speakers', 'photo', 1024 * 1024);

        // Foto baru menggantikan yang lama; kosong = pertahankan foto yang ada.
        if ($photo !== null && $current && $current->photo && $photo !== $current->photo) {
            $this->images->deleteIfUploaded($current->photo);
        }

        return [
            'name' => trim($data['name']),
            'title' => $data['title'] ?? null,
            'role' => trim($data['role']),
            'topic' => $data['topic'] ?? null,
            'bio' => $data['bio'] ?? null,
            'photo' => $photo ?? $current?->photo,
        ];
    }

    protected function afterDelete(Model $model): void
    {
        $this->images->deleteIfUploaded($model->photo);
    }
}
