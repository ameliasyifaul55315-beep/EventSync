<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Schedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Schedule> */
class ScheduleFactory extends Factory
{
    protected $model = Schedule::class;

    public function definition(): array
    {
        $start = now()->addDays(10)->setTime(10, 0);

        return [
            'event_id' => Event::factory(),
            'speaker_id' => null,
            'session_name' => 'Morning',
            'title' => fake()->sentence(3),
            'description' => null,
            'location' => 'Main Hall',
            'person_in_charge' => 'Committee',
            'start_at' => $start,
            'end_at' => $start->copy()->addHour(),
            'sort_order' => 0,
        ];
    }
}
