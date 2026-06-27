<?php

namespace Database\Seeders;

use App\Support\SqlDate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $adminEmail = strtolower(config('linkly.admin_email'));

        if (DB::table('users')->where('email', $adminEmail)->exists()) {
            return;
        }

        $now = SqlDate::now();

        DB::table('users')->insert([
            'email' => $adminEmail,
            'full_name' => 'System Admin',
            'password_hash' => Hash::make(config('linkly.admin_password')),
            'role' => 'admin',
            'is_approved' => true,
            'created_date' => $now,
            'updated_date' => $now,
        ]);
    }
}
