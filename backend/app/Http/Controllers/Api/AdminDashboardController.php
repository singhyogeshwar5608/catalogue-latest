<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoostPlan;
use App\Models\Store;
use App\Models\StoreBoost;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __invoke()
    {
        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth();

        $totalStores = Store::count();
        $activeStores = Store::where('is_active', true)->count();
        $verifiedStores = Store::where('is_verified', true)->count();
        $boostedStores = Store::where('is_boosted', true)->count();
        $monthlyNewStores = Store::where('created_at', '>=', $monthStart)->count();

        $totalBoosts = StoreBoost::count();
        $activeBoosts = StoreBoost::where('status', 'active')->where('ends_at', '>', $now)->count();

        $monthlyBoostRevenue = StoreBoost::join('boost_plans', 'store_boosts.boost_plan_id', '=', 'boost_plans.id')
            ->where('store_boosts.starts_at', '>=', $monthStart)
            ->sum('boost_plans.price');

        $recentStores = Store::with('category:id,name')
            ->latest()
            ->take(5)
            ->get([
                'id',
                'name',
                'slug',
                'logo',
                'category_id',
                'is_verified',
                'is_active',
                'is_boosted',
                'created_at',
            ])
            ->map(function (Store $store) {
                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'logo' => $store->logo,
                    'category' => $store->category?->name,
                    'is_verified' => (bool) $store->is_verified,
                    'is_active' => (bool) $store->is_active,
                    'is_boosted' => (bool) $store->is_boosted,
                    'created_at' => $store->created_at,
                ];
            });

        $recentBoosts = StoreBoost::with([
                'store:id,name,slug',
                'plan:id,name,price',
            ])
            ->latest()
            ->take(5)
            ->get()
            ->map(function (StoreBoost $boost) {
                return [
                    'id' => $boost->id,
                    'store_name' => $boost->store?->name,
                    'store_slug' => $boost->store?->slug,
                    'plan_name' => $boost->plan?->name,
                    'price' => $boost->plan?->price ?? 0,
                    'status' => $boost->status,
                    'ends_at' => $boost->ends_at,
                ];
            });

        $atRiskStores = Store::where(function ($query) {
                $query->where('is_active', false)
                    ->orWhere('is_verified', false);
            })
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'slug', 'is_active', 'is_verified', 'boost_expiry_date'])
            ->map(function (Store $store) {
                return [
                    'id' => $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'is_active' => (bool) $store->is_active,
                    'is_verified' => (bool) $store->is_verified,
                    'boost_expiry_date' => $store->boost_expiry_date,
                ];
            });

        $planDistribution = BoostPlan::select('id', 'name', 'price')
            ->withCount([
                'storeBoosts as total_boosts' => function ($query) {
                    $query->select(DB::raw('count(*)'));
                },
                'storeBoosts as active_boosts' => function ($query) use ($now) {
                    $query->where('status', 'active')
                        ->where('ends_at', '>', $now)
                        ->select(DB::raw('count(*)'));
                },
            ])
            ->orderByDesc('priority_weight')
            ->get();

        return $this->successResponse('Dashboard stats retrieved successfully.', [
            'totals' => [
                'totalStores' => $totalStores,
                'activeStores' => $activeStores,
                'verifiedStores' => $verifiedStores,
                'boostedStores' => $boostedStores,
                'totalBoosts' => $totalBoosts,
                'activeBoosts' => $activeBoosts,
                'monthlyNewStores' => $monthlyNewStores,
                'monthlyBoostRevenue' => $monthlyBoostRevenue,
            ],
            'recentStores' => $recentStores,
            'recentBoosts' => $recentBoosts,
            'atRiskStores' => $atRiskStores,
            'planDistribution' => $planDistribution,
        ]);
    }
}
