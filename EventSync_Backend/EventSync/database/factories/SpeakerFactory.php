<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\Speaker;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Speaker> */
class SpeakerFactory extends Factory
{
    protected $model = Speaker::class;

    public function definition(): array
    {
        return [
            'event_id' => Event::factory(),
            'name' => fake()->name(),
            'title' => fake()->jobTitle(),
            'role' => 'Speaker',
            'topic' => fake()->sentence(4),
            'bio' => fake()->sentence(),
            'photo' => null,
        ];
    }
}
