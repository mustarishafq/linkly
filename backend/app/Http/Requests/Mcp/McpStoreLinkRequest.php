<?php

namespace App\Http\Requests\Mcp;

class McpStoreLinkRequest extends McpFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'slug' => ['required', 'string', 'max:128'],
            'destination_url' => ['required', 'string', 'url', 'max:2048'],
            'title' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'string', 'in:active,paused,expired'],
            'campaign_id' => ['nullable', 'integer'],
            'domain_id' => ['nullable', 'integer'],
            'tags' => ['nullable', 'array'],
        ];
    }
}
