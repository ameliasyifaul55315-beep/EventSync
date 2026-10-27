<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Error aturan bisnis yang ingin dijawab dengan pesan + status HTTP tertentu
 * (mis. 422 "You are already registered for this event.", 409 "event terkunci").
 * Dirender otomatis menjadi { "success": false, "message": "..." }.
 */
class ApiException extends Exception
{
    public function __construct(string $message, private readonly int $status = 400, private readonly array $errors = [])
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        $body = ['success' => false, 'message' => $this->getMessage()];

        if ($this->errors) {
            $body['errors'] = $this->errors;
        }

        return response()->json($body, $this->status);
    }
}
