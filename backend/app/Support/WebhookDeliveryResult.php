<?php

namespace App\Support;

class WebhookDeliveryResult
{
    public function __construct(
        public bool $ok,
        public ?int $status = null,
        public ?string $message = null,
        public ?string $receiverBody = null,
    ) {}

    public static function success(?int $status = null): self
    {
        return new self(true, $status);
    }

    public static function failure(string $message, ?int $status = null, ?string $receiverBody = null): self
    {
        return new self(false, $status, $message, $receiverBody);
    }

    /** @return array{ok: bool, status: int|null, message: string|null, receiver_body: string|null} */
    public function toArray(): array
    {
        return [
            'ok' => $this->ok,
            'status' => $this->status,
            'message' => $this->message,
            'receiver_body' => $this->receiverBody,
        ];
    }
}
