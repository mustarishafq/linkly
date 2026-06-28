<?php

namespace App\Http\Requests\Mcp;

use App\Support\McpResponse;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

abstract class McpFormRequest extends FormRequest
{
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            McpResponse::error('The given data was invalid.', 422, $validator->errors()->all())
        );
    }
}
