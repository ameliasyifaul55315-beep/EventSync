<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Committee;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Schedule;
use App\Models\Speaker;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Data contoh UNTUK DEVELOPMENT SAJA. Isinya sama dengan dummy data frontend (database/seeders/demo_data.json
 * dihasilkan dari data/*.js), sehingga tampilan frontend setelah terhubung ke backend sama dengan prototype.
 *
 * Tanggal event RELATIF terhadap hari seeder dijalankan ("@45|08:30" = 45 hari lagi pukul 08:30),
 * jadi selalu ada event Upcoming, Ongoing, dan Completed.
 *
 * Password semua akun demo = config('app.demo_password') (env SEED_DEMO_PASSWORD, default "demo1234").
 * Itu password DUMMY. Jangan pernah menjalankan seeder ini di server produksi.
 */
class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->error('DemoDataSeeder dilewati: APP_ENV=production. Akun demo tidak boleh ada di produksi.');

            return;
        }

        $data = json_decode(file_get_contents(__DIR__.'/demo_data.json'), true, flags: JSON_THROW_ON_ERROR);
        $password = (string) config('app.demo_password');

        Model::unguarded(function () use ($data, $password) {
            DB::transaction(function () use ($data, $password) {
                foreach ($data['categories'] as $row) {
                    Category::query()->updateOrCreate(['id' => $row['id']], $row);
                }

                foreach ($data['users'] as $row) {
                    $row['created_at'] = $this->at($row['created_at']);
                    // Password di-hash otomatis oleh cast "hashed" pada model User.
                    User::query()->updateOrCreate(['id' => $row['id']], $row + ['password' => $password]);
                }

                foreach ($data['events'] as $row) {
                    foreach (['start_at', 'end_at', 'submitted_at', 'reviewed_at', 'created_at'] as $col) {
                        $row[$col] = isset($row[$col]) ? $this->at($row[$col]) : null;
                    }
                    Event::query()->updateOrCreate(['id' => $row['id']], $row);
                }

                foreach ($data['speakers'] as $row) {
                    $row['photo'] = $row['photo'] !== '' ? $row['photo'] : null;
                    Speaker::query()->updateOrCreate(['id' => $row['id']], $row);
                }

                foreach ($data['schedules'] as $row) {
                    $row['start_at'] = $this->at($row['start_at']);
                    $row['end_at'] = $this->at($row['end_at']);
                    Schedule::query()->updateOrCreate(['id' => $row['id']], $row);
                }

                foreach ($data['committees'] as $row) {
                    Committee::query()->updateOrCreate(['id' => $row['id']], $row);
                }

                foreach ($data['registrations'] as $row) {
                    $row['registered_at'] = $this->at($row['registered_at']);
                    $row['cancelled_at'] = $row['cancelled_at'] ? $this->at($row['cancelled_at']) : null;
                    EventRegistration::query()->updateOrCreate(['id' => $row['id']], $row);
                }
            });
        });

        $this->command?->info('Demo data siap. Password akun demo = "'.$password.'" (hanya development).');
    }

    /** "@45|08:30" -> hari ini + 45 hari, pukul 08:30. */
    private function at(string $marker): Carbon
    {
        [$days, $time] = explode('|', ltrim($marker, '@'));
        [$h, $m] = array_map('intval', explode(':', $time));

        return Carbon::today()->addDays((int) $days)->setTime($h, $m);
    }
}
