<?php

namespace App\Services;

class NexusJwtService
{
    public function verify(string $token, string $secret, string $issuer = ''): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new \RuntimeException('Invalid token format');
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $expectedSig = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$headerB64}.{$payloadB64}", $secret, true)), '+/', '-_'), '=');

        if (! hash_equals($expectedSig, $signatureB64)) {
            throw new \RuntimeException('Invalid token signature');
        }

        $payloadJson = base64_decode(strtr($payloadB64, '-_', '+/').str_repeat('=', (4 - strlen($payloadB64) % 4) % 4));
        $payload = json_decode($payloadJson ?: '', true);

        if (! is_array($payload)) {
            throw new \RuntimeException('Invalid token payload');
        }

        if (! empty($payload['exp']) && ((int) $payload['exp']) * 1000 < (int) (microtime(true) * 1000)) {
            throw new \RuntimeException('Token has expired');
        }

        if ($issuer !== '' && ($payload['iss'] ?? null) !== $issuer) {
            throw new \RuntimeException('Invalid token issuer');
        }

        if (empty($payload['sub'])) {
            throw new \RuntimeException('Token missing sub claim');
        }

        $email = strtolower(trim((string) ($payload['email'] ?? '')));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \RuntimeException('Invalid email in token');
        }

        $payload['email'] = $email;

        return $payload;
    }
}
