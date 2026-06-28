<?php

namespace App\Http\Requests\Mcp;

class McpUpdateLinkRequest extends McpFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'slug' => ['sometimes', 'string', 'max:128'],
            'destination_url' => ['sometimes', 'string', 'url', 'max:2048'],
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'in:active,paused,expired'],
            'campaign_id' => ['sometimes', 'nullable', 'integer'],
            'domain_id' => ['sometimes', 'nullable', 'integer'],
            'tags' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
