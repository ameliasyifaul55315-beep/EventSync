<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Event;
use App\Support\Api;
use Illuminate\Http\JsonResponse;

/** GET /api/categories (publik). Dipakai filter di events.html, schedule.html, kartu kategori di Home. */
class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['events as events_count' => fn ($q) => $q->where('status', Event::APPROVED)])
            ->orderBy('id')
            ->get();

        return Api::ok('Categories retrieved successfully', CategoryResource::list($categories));
    }
}
