<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BannerTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BannerTemplateController extends Controller
{
    /**
     * List all banner templates (with optional category filter)
     */
    public function index(Request $request)
    {
        $query = BannerTemplate::with('category:id,name,slug');

        // Filter by category if provided
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        // Filter by device if provided
        if ($request->filled('device')) {
            $query->where('device', $request->string('device'));
        }

        // Filter by active status if provided
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $templates = $query->orderByDesc('created_at')->get();

        return $this->successResponse('Banner templates retrieved successfully.', $templates);
    }

    /**
     * Create a new banner template (super_admin only)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'device' => 'required|in:mobile,desktop',
            'bg_image' => 'nullable|string|max:4000000',
            'bg_color' => 'nullable|string|max:20',
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'show_cta_button' => 'nullable|boolean',
            'cta_text' => 'nullable|string|max:100',
            'cta_bg_color' => 'nullable|string|max:20',
            'cta_text_color' => 'nullable|string|max:20',
            'cta_border_radius' => 'nullable|integer|min:0|max:50',
            'frames' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $template = BannerTemplate::create($validator->validated());
        $template->load('category:id,name,slug');

        return $this->successResponse('Banner template created successfully.', $template, 201);
    }

    /**
     * Get a single banner template
     */
    public function show(int $id)
    {
        $template = BannerTemplate::with('category:id,name,slug')->find($id);

        if (!$template) {
            return $this->errorResponse('Banner template not found.', 404);
        }

        return $this->successResponse('Banner template retrieved successfully.', $template);
    }

    /**
     * Update a banner template (super_admin only)
     */
    public function update(Request $request, int $id)
    {
        $template = BannerTemplate::find($id);

        if (!$template) {
            return $this->errorResponse('Banner template not found.', 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'category_id' => 'sometimes|required|exists:categories,id',
            'device' => 'sometimes|required|in:mobile,desktop',
            'bg_image' => 'nullable|string|max:4000000',
            'bg_color' => 'nullable|string|max:20',
            'title' => 'nullable|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'show_cta_button' => 'nullable|boolean',
            'cta_text' => 'nullable|string|max:100',
            'cta_bg_color' => 'nullable|string|max:20',
            'cta_text_color' => 'nullable|string|max:20',
            'cta_border_radius' => 'nullable|integer|min:0|max:50',
            'frames' => 'nullable|array',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $template->update($validator->validated());
        $template->load('category:id,name,slug');

        return $this->successResponse('Banner template updated successfully.', $template);
    }

    /**
     * Delete a banner template (super_admin only)
     */
    public function destroy(int $id)
    {
        $template = BannerTemplate::find($id);

        if (!$template) {
            return $this->errorResponse('Banner template not found.', 404);
        }

        $template->delete();

        return $this->successResponse('Banner template deleted successfully.');
    }

    /**
     * Get active templates for a specific category (public endpoint)
     */
    public function getByCategory(int $categoryId)
    {
        $templates = BannerTemplate::with('category:id,name,slug')
            ->where('category_id', $categoryId)
            ->where('is_active', true)
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse('Category banner templates retrieved successfully.', $templates);
    }
}
