<?php

namespace App\Support;

use Carbon\Carbon;
use DateTimeInterface;

class SqlDate
{
    public static function now(?DateTimeInterface $date = null): string
    {
        $date = $date ?? now(config('linkly.timezone'));

        return $date->format('Y-m-d H:i:s.v');
    }

    public static function parse(mixed $value): Carbon
    {
        return Carbon::parse($value, config('linkly.timezone'));
    }

    public static function toIso8601(mixed $value): string
    {
        return self::parse($value)->toIso8601String();
    }
}
