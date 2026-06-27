<?php

namespace App\Services;

use Carbon\Carbon;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Facades\DB;

class JwtService
{
    public function issueToken(array $user): string
    {
        $payload = [
            'sub' => $user['id'],
            'role' => $user['role'],
            'email' => $user['email'],
            'iat' => time(),
            'exp' => time() + (7 * 24 * 60 * 60),
        ];

        return JWT::encode($payload, config('linkly.jwt_secret'), 'HS256');
    }

    public function verify(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key(config('linkly.jwt_secret'), 'HS256'));

            return (array) $decoded;
        } catch (\Throwable) {
            return null;
        }
    }

    public function toSafeUser(object|array $row): array
    {
        $user = (array) $row;

        return [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'role' => $user['role'],
            'is_approved' => (bool) $user['is_approved'],
            'created_date' => Carbon::parse($user['created_date'])->toIso8601String(),
            'updated_date' => Carbon::parse($user['updated_date'])->toIso8601String(),
        ];
    }

    public function findApprovedUserById(string $id): ?object
    {
        return DB::table('users')
            ->select('id', 'email', 'full_name', 'role', 'is_approved', 'created_date', 'updated_date')
            ->where('id', $id)
            ->first();
    }

    public function readBearerToken(?string $header): ?string
    {
        if (! $header || ! str_starts_with($header, 'Bearer ')) {
            return null;
        }

        $token = trim(substr($header, 7));

        return $token !== '' ? $token : null;
    }
}
