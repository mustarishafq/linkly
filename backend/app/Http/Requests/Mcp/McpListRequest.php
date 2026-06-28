<?php

namespace App\Http\Requests\Mcp;

class McpListRequest extends McpFormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $max = (int) config('mcp.max_per_page', 200);

        return [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'string', 'max:64'],
            'sort_order' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.$max],
            'action' => ['nullable', 'string', 'max:64'],
        ];
    }
}
