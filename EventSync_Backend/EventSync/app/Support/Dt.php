<?php

namespace App\Support;

use DateTimeInterface;

/**
 * Frontend memakai waktu "naif" tanpa zona: "2026-11-20T09:00:00" (bukan ISO-UTC "....Z").
 * Semua tanggal di JSON keluar lewat helper ini supaya new Date(...) di browser tidak bergeser.
 */
final class Dt
{
    public static function iso(?DateTimeInterface $date): ?string
    {
        return $date?->format('Y-m-d\TH:i:s');
    }
}
