<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validasi isi event (create & update oleh organizer). Dijalankan di server —
 * validasi di JavaScript hanyalah kenyamanan, bukan keamanan.
 */
class EventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;   // akses dijaga middleware role + Policy di controller
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'description' => ['required', 'string', 'min:20', 'max:5000'],
            'location' => ['required', 'string', 'max:200'],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'poster_path' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'category_id.exists' => 'Choose a valid category.',
            'end_at.after' => 'End must be after start.',
            'description.min' => 'Description must be at least 20 characters.',
        ];
    }
}
