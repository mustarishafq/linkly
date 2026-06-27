<?php

namespace App\Support;

use Illuminate\Support\Str;

class IdGenerator
{
    /** Random token for reset links, verification codes, etc. — not a database primary key. */
    public static function make(): string
    {
        return Str::random(40);
    }
}
