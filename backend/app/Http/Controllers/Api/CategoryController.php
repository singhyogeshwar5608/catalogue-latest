<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannerTemplate;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        try {
            $categories = Cache::remember('categories_list', 60, function () {
                return Category::query()->orderBy('name')->get();
            });

            return $this->successResponse('Categories retrieved successfully.', $categories);
        } catch (\Throwable $e) {
            Log::error('categories index', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            try {
                return $this->successResponse('Categories retrieved successfully.', Category::query()->orderBy('name')->get());
            } catch (\Throwable) {
                return $this->successResponse('Categories retrieved successfully.', collect());
            }
        }
    }

    /** One hero slide per visible category: first banner_images URL, else legacy banner_image. */
    public function heroBanners(Request $request)
    {
        try {
            $categories = Cache::remember('categories_hero', 60, function () {
                return Category::query()->orderBy('name')->get();
            });
        } catch (\Throwable $e) {
            Log::error('categories heroBanners', ['message' => $e->getMessage()]);
            try {
                $categories = Category::query()->orderBy('name')->get();
            } catch (\Throwable) {
                $categories = collect();
            }
        }

        $slides = [];
        foreach ($categories as $category) {
            $raw = $category->getAttribute('banner_images');
            if (is_string($raw) && trim($raw) !== '') {
                $decoded = json_decode($raw, true);
                $raw = is_array($decoded) ? $decoded : [];
            }
            if (! is_array($raw)) {
                $raw = [];
            }

            $first = null;
            foreach ($raw as $url) {
                if (is_string($url) && trim($url) !== '') {
                    $first = trim($url);
                    break;
                }
            }

            if ($first === null) {
                $single = $category->getAttribute('banner_image');
                if (is_string($single) && trim($single) !== '') {
                    $first = trim($single);
                }
            }

            if ($first === null) {
                continue;
            }

            $titleAttr = $category->getAttribute('banner_title');
            $nameAttr = $category->getAttribute('name');
            $subAttr = $category->getAttribute('banner_subtitle');

            $title = is_string($titleAttr) && trim((string) $titleAttr) !== ''
                ? trim((string) $titleAttr)
                : (is_string($nameAttr) ? (string) $nameAttr : 'Category');

            $subtitle = is_string($subAttr) && trim((string) $subAttr) !== ''
                ? trim((string) $subAttr)
                : null;

            $slides[] = [
                'key' => (string) $category->getKey(),
                'image' => $first,
                'title' => $title,
                'subtitle' => $subtitle,
            ];
        }

        return $this->successResponse('Hero banners retrieved successfully.', $slides);
    }

    public function show(string $slug)
    {
        $category = Category::where('slug', $slug)
            ->where('is_active', true)
            ->first();

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        return $this->successResponse('Category retrieved successfully.', $category);
    }

    public function updateBanner(Request $request, int $id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        $validator = Validator::make($request->all(), [
            'banner_images' => 'nullable|array',
            'banner_images.*' => 'nullable|string|max:150000',
            'banner_title' => 'nullable|string|max:255',
            'banner_subtitle' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();

        $category = DB::transaction(function () use ($category, $data) {
            $updatePayload = $data;
            $hasBannerImagesPayload = array_key_exists('banner_images', $updatePayload);

            if ($hasBannerImagesPayload) {
                $updatePayload['banner_images'] = array_values(
                    array_filter($updatePayload['banner_images'] ?? [], fn ($value) => filled($value))
                );
                $updatePayload['banner_image'] = $updatePayload['banner_images'][0] ?? null;
            }

            $category->update($updatePayload);
            $category->refresh();

            if ($hasBannerImagesPayload) {
                $images = $updatePayload['banner_images'] ?? [];

                BannerTemplate::where('category_id', $category->id)
                    ->where('device', 'desktop')
                    ->delete();

                foreach ($images as $index => $image) {
                    BannerTemplate::create([
                        'category_id' => $category->id,
                        'device' => 'desktop',
                        'name' => sprintf('%s Desktop Banner #%d', $category->name, $index + 1),
                        'bg_image' => $image,
                        'bg_color' => $category->banner_color ?? '#1a1a2e',
                        'title' => $category->banner_title,
                        'subtitle' => $category->banner_subtitle,
                    ]);
                }
            } elseif (array_key_exists('banner_title', $updatePayload) || array_key_exists('banner_subtitle', $updatePayload)) {
                BannerTemplate::where('category_id', $category->id)
                    ->where('device', 'desktop')
                    ->update([
                        'title' => $category->banner_title,
                        'subtitle' => $category->banner_subtitle,
                    ]);
            }

            return $category;
        });

        Cache::forget('categories_list');
        Cache::forget('categories_hero');

        return $this->successResponse('Category banner updated successfully.', $category);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'slug' => 'required|string|alpha_dash|max:255|unique:categories,slug',
            'business_type' => 'required|in:product,service,hybrid',
            'is_active' => 'sometimes|boolean',
            'banner_image' => 'nullable|string|max:150000',
            'banner_images' => 'nullable|array',
            'banner_images.*' => 'nullable|string|max:150000',
            'banner_title' => 'nullable|string|max:255',
            'banner_subtitle' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $data['is_active'] = $data['is_active'] ?? true;

        if (array_key_exists('banner_images', $data)) {
            $data['banner_images'] = array_values(array_filter($data['banner_images'] ?? [], fn ($value) => filled($value)));
            $data['banner_image'] = $data['banner_images'][0] ?? null;
        } elseif (! empty($data['banner_image'])) {
            $data['banner_images'] = [$data['banner_image']];
        }

        $category = Category::create($data);
        Cache::forget('categories_list');
        Cache::forget('categories_hero');

        return $this->successResponse('Category created successfully.', $category);
    }

    public function destroy(int $id)
    {
        $category = Category::find($id);

        if (! $category) {
            return $this->errorResponse('Category not found.', 404);
        }

        $storesUsingCategory = $category->stores()->count();

        if ($storesUsingCategory > 0) {
            return $this->errorResponse("{$storesUsingCategory} stores are using this category.", 422);
        }

        $category->delete();
        Cache::forget('categories_list');
        Cache::forget('categories_hero');

        return $this->successResponse('Category deleted successfully.');
    }
}
