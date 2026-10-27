<?php

namespace Tests\Unit;

use App\Models\Event;
use App\Support\Dt;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    public function test_dt_iso_has_no_timezone_suffix(): void
    {
        $this->assertSame('2026-11-20T09:00:00', Dt::iso(Carbon::parse('2026-11-20 09:00:00', 'Asia/Jakarta')));
        $this->assertNull(Dt::iso(null));
    }

    public function test_event_statuses_match_the_frontend(): void
    {
        $this->assertSame(['draft', 'pending_review', 'approved', 'rejected', 'cancelled'], Event::STATUSES);
    }
}
