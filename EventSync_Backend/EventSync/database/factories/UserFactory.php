<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected $model = User::class;

    public const TEST_PASSWORD = 'password123';   // hanya untuk test otomatis

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => strtolower(fake()->unique()->safeEmail()),
            'password' => self::TEST_PASSWORD,      // di-hash oleh cast "hashed"
            'role' => User::ROLE_USER,
            'phone' => null,
            'organization_name' => null,
            'is_active' => true,
        ];
    }

    public function organizer(): static
    {
        return $this->state(fn () => ['role' => User::ROLE_ORGANIZER, 'organization_name' => fake()->company()]);
    }

    public function admin(): static
    {
        return $this->state(fn () => ['role' => User::ROLE_ADMIN]);
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
