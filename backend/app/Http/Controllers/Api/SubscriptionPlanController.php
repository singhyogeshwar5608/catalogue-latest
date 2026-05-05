<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class SubscriptionPlanController extends Controller
{
    /** Full plan rows (including inactive) for merchant dashboard catalog — same ordering as admin list. */
    private function allPlansForCatalogQuery()
    {
        $query = SubscriptionPlan::query();

        if (Schema::hasColumn('subscription_plans', 'is_active')) {
            $query->orderByDesc('is_active');
        }

        if (Schema::hasColumn('subscription_plans', 'display_order')) {
            // Nulls last, then ascending 1..N
            $query->orderByRaw('display_order is null')->orderBy('display_order');
        }

        if (Schema::hasColumn('subscription_plans', 'is_popular')) {
            $query->orderByDesc('is_popular');
        }

        if (Schema::hasColumn('subscription_plans', 'price')) {
            $query->orderBy('price');
        } else {
            $query->orderBy('id');
        }

        return $query;
    }

    public function publicIndex()
    {
        $query = SubscriptionPlan::query();

        if (Schema::hasColumn('subscription_plans', 'is_active')) {
            $query->where('is_active', true);
        }

        if (Schema::hasColumn('subscription_plans', 'display_order')) {
            $query->orderByRaw('display_order is null')->orderBy('display_order');
        }

        if (Schema::hasColumn('subscription_plans', 'is_popular')) {
            $query->orderByDesc('is_popular');
        }

        if (Schema::hasColumn('subscription_plans', 'price')) {
            $query->orderBy('price');
        } else {
            $query->orderBy('id');
        }

        $plans = $query->get();

        return $this->successResponse('Subscription plans retrieved successfully.', $plans);
    }

    /**
     * Authenticated merchants: read-only list of every plan row (active + inactive) for the subscription page catalog.
     */
    public function catalogIndex()
    {
        $plans = $this->allPlansForCatalogQuery()->get();

        return $this->successResponse('Subscription plan catalog retrieved successfully.', $plans);
    }

    /** Read-only add-on prices + billing-term discount percents for checkout (any authenticated merchant). */
    public function publicAddonPrices()
    {
        $payload = array_merge(
            PlatformSetting::subscriptionAddonChargesPayload(),
            PlatformSetting::subscriptionBillingDiscountsPayload()
        );

        return $this->successResponse('Subscription add-on charges retrieved.', $payload);
    }

    public function index()
    {
        $plans = $this->allPlansForCatalogQuery()->get();

        return $this->successResponse('Subscription plans retrieved successfully.', $plans);
    }

    public function store(Request $request)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'price' => 'required|integer|min:0',
            'billing_cycle' => 'nullable|in:monthly,yearly',
            'duration_days' => 'nullable|integer|min:1|max:365',
            'billing_discount_tier' => 'nullable|in:one_month,three_months,one_year',
            'display_order' => 'nullable|integer|min:1|max:9999',
            'max_products' => 'required|integer|min:1',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'features' => 'nullable',
            'description' => 'nullable|string',
        ];

        if (Schema::hasColumn('subscription_plans', 'slug')) {
            $rules['slug'] = 'nullable|string|max:255|unique:subscription_plans,slug';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $data['billing_cycle'] = $data['billing_cycle'] ?? 'monthly';

        if (Schema::hasColumn('subscription_plans', 'slug')) {
            $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? Str::slug($data['name']));
        }

        $data['features'] = $this->normalizeFeatures($data['features'] ?? []);

        $plan = SubscriptionPlan::create($data);

        return $this->successResponse('Subscription plan created successfully.', $plan, 201);
    }

    public function update(Request $request, SubscriptionPlan $plan)
    {
        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'price' => 'sometimes|required|integer|min:0',
            'billing_cycle' => 'sometimes|nullable|in:monthly,yearly',
            'duration_days' => 'sometimes|nullable|integer|min:1|max:365',
            'billing_discount_tier' => 'sometimes|nullable|in:one_month,three_months,one_year',
            'display_order' => 'sometimes|nullable|integer|min:1|max:9999',
            'max_products' => 'sometimes|required|integer|min:1',
            'is_popular' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'features' => 'nullable',
            'description' => 'nullable|string',
        ];

        if (Schema::hasColumn('subscription_plans', 'slug')) {
            $rules['slug'] = 'sometimes|nullable|string|max:255|unique:subscription_plans,slug,'.$plan->id;
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        if (array_key_exists('billing_cycle', $data) && ($data['billing_cycle'] === null || $data['billing_cycle'] === '')) {
            unset($data['billing_cycle']);
        }

        if (Schema::hasColumn('subscription_plans', 'slug')) {
            if (array_key_exists('slug', $data)) {
                $data['slug'] = $this->generateUniqueSlug($data['slug'] ?? ($data['name'] ?? $plan->name), $plan->id);
            }

            if (array_key_exists('name', $data) && ! array_key_exists('slug', $data)) {
                $data['slug'] = $this->generateUniqueSlug(Str::slug($data['name']), $plan->id);
            }
        }

        if (array_key_exists('features', $data)) {
            $data['features'] = $this->normalizeFeatures($data['features']);
        }

        $plan->update($data);

        return $this->successResponse('Subscription plan updated successfully.', $plan);
    }

    public function destroy(SubscriptionPlan $plan)
    {
        if ($plan->storeSubscriptions()->active()->exists()) {
            return $this->errorResponse('Cannot delete plan while active subscriptions exist.', 409);
        }

        $plan->delete();

        return $this->successResponse('Subscription plan deleted successfully.');
    }

    private function generateUniqueSlug(string $baseSlug, ?int $ignoreId = null): string
    {
        $slug = Str::slug($baseSlug);
        $original = $slug;
        $counter = 1;

        while (SubscriptionPlan::where('slug', $slug)
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = $original.'-'.$counter++;
        }

        return $slug;
    }

    private function normalizeFeatures(mixed $features): array
    {
        if (is_array($features)) {
            return array_values(array_filter(array_map('trim', $features)));
        }

        if (is_string($features)) {
            $items = preg_split('/\r\n|\n|\r|,/', $features) ?: [];

            return array_values(array_filter(array_map('trim', $items)));
        }

        return [];
    }
}
