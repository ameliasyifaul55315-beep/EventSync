<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Event;
use App\Support\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Create / update / delete kategori (admin).  Membaca daftar kategori memakai GET /api/categories (publik).
 * Halaman: admin/categories.html.
 */
class CategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $category = new Category(['name' => trim($data['name']), 'description' => $data['description'] ?? null, 'color' => $data['color']]);
        $category->slug = Category::uniqueSlug($category->name);
        $category->save();

        return Api::created('Category created.', CategoryResource::one($category, $request));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $category = Category::query()->find($id) ?? throw new ApiException('Category not found.', 404);
        $data = $this->validated($request, $category->id);

        $category->fill(['name' => trim($data['name']), 'description' => $data['description'] ?? null, 'color' => $data['color']]);

        if ($category->isDirty('name')) {
            $category->slug = Category::uniqueSlug($category->name, $category->id);
        }

        $category->save();

        return Api::ok('Category updated.', CategoryResource::one($category, $request));
    }

    public function destroy(string $id): JsonResponse
    {
        $category = Category::query()->find($id) ?? throw new ApiException('Category not found.', 404);

        // events.category_id = RESTRICT (juga terhadap event yang sudah di-soft-delete).
        if (Event::withTrashed()->where('category_id', $category->id)->exists()) {
            throw new ApiException('This category still has events and cannot be deleted.', 422);
        }

        $category->delete();

        return Api::ok('Category deleted.');
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ], ['color.regex' => 'Choose a valid color (e.g. #7C3AED).']);

        // Nama unik tanpa membedakan huruf besar/kecil.
        $exists = Category::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower(trim($data['name']))])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['name' => 'This category already exists.']);
        }

        return $data;
    }
}
