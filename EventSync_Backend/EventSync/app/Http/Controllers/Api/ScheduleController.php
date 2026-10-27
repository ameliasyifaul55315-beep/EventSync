<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\ScheduleResource;
use App\Models\Event;
use App\Models\Schedule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/** Jadwal/sesi acara. Halaman: organizer/schedule.html. Tabel: schedules (N:1 ke events, N:1 opsional ke speakers). */
class ScheduleController extends EventChildController
{
    protected function model(): string
    {
        return Schedule::class;
    }

    protected function resource(): string
    {
        return ScheduleResource::class;
    }

    protected function listQuery(Event $event)
    {
        return Schedule::query()->with('speaker')->where('event_id', $event->id)->orderBy('start_at')->orderBy('sort_order');
    }

    protected function rules(Event $event): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'session_name' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:2000'],
            'location' => ['nullable', 'string', 'max:150'],
            'person_in_charge' => ['nullable', 'string', 'max:120'],
            // Speaker harus milik event yang sama.
            'speaker_id' => ['nullable', 'integer', Rule::exists('speakers', 'id')->where('event_id', $event->id)],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
        ];
    }

    protected function messages(): array
    {
        return [
            'end_at.after' => 'End must be after start.',
            'speaker_id.exists' => 'Choose a speaker from this event.',
        ];
    }

    protected function attributes(array $data, ?Model $current): array
    {
        return [
            'title' => trim($data['title']),
            'session_name' => $data['session_name'] ?? null,
            'description' => $data['description'] ?? null,
            'location' => $data['location'] ?? null,
            'person_in_charge' => $data['person_in_charge'] ?? null,
            'speaker_id' => $data['speaker_id'] ?? null,
            'start_at' => $data['start_at'],
            'end_at' => $data['end_at'],
        ];
    }

    protected function beforeCreate(Model $model, Event $event): void
    {
        $model->sort_order = Schedule::query()->where('event_id', $event->id)->count();
    }
}
