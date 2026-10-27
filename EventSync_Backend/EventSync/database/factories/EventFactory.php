<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Event;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Event> */
class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        $title = fake()->unique()->sentence(3);
        $start = now()->addDays(10)->setTime(9, 0);

        return [
            'organizer_id' => User::factory()->organizer(),
            'category_id' => Category::factory(),
            'title' => $title,
            'slug' => Str::slug($title).'-'.Str::lower(Str::random(5)),
            'description' => fake()->paragraph(2),
            'location' => fake()->city().' Convention Hall',
            'start_at' => $start,
            'end_at' => $start->copy()->setTime(17, 0),
            'capacity' => 100,
            'poster_path' => Event::DEFAULT_POSTER,
            'is_featured' => false,
            'status' => Event::DRAFT,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => Event::APPROVED,
            'submitted_at' => now()->subDays(3),
            'reviewed_at' => now()->subDays(2),
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => Event::PENDING, 'submitted_at' => now()->subDay()]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => Event::REJECTED,
            'submitted_at' => now()->subDays(3),
            'reviewed_at' => now()->subDays(2),
            'review_note' => 'Please add a complete schedule.',
        ]);
    }

    public function startingAt(CarbonInterface $start, ?CarbonInterface $end = null): static
    {
        return $this->state(fn () => ['start_at' => $start, 'end_at' => $end ?? $start->copy()->addHours(6)]);
    }

    /** Sedang berlangsung (mulai kemarin, selesai besok). */
    public function ongoing(): static
    {
        return $this->startingAt(now()->subDay(), now()->addDay());
    }

    /** Sudah selesai. */
    public function completed(): static
    {
        return $this->startingAt(now()->subDays(10), now()->subDays(10)->addHours(6));
    }
}
