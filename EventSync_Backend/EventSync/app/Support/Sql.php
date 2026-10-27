<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

final class Sql
{
    /** Pola LIKE "mengandung kata" dengan karakter % dan _ milik user di-escape (MySQL). */
    public static function contains(string $term): string
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            return '%'.$term.'%';   // SQLite tidak punya escape default; cukup untuk test.
        }

        return '%'.addcslashes($term, '%_\\').'%';
    }
}
