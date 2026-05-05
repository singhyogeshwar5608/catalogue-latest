<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoostPlan;
use App\Models\Store;
use App\Models\StoreBoost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Carbon;

class StoreBoostController extends Controller
{
    public function index()
    {
        $boosts = StoreBoost::with(['store', 'plan'])
            ->orderByDesc('status')
            ->orderByDesc('ends_at')
            ->get();

        return $this->successResponse('Store boosts retrieved successfully.', $boosts);
    }

    public function show(Request $request, Store $store)
    {
        if ($request->user()->role !== 'super_admin' && $request->user()->id !== $store->user_id) {
            return $this->errorResponse('You are not authorized to view this store boost.', 403);
        }

        $store->load('activeBoost.plan');

        return $this->successResponse('Store boost retrieved successfully.', [
            'store' => $store,
            'activeBoost' => $store->activeBoost,
        ]);
    }

    public function activate(Request $request, Store $store)
    {
        if ($request->user()->role !== 'super_admin' && $request->user()->id !== $store->user_id) {
            return $this->errorResponse('You are not authorized to activate boosts for this store.', 403);
        }

        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:boost_plans,id',
            'starts_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $plan = BoostPlan::find($data['plan_id']);

        if (! $plan || ! $plan->is_active) {
            return $this->errorResponse('Selected plan is not active.', 422);
        }

        $startsAt = isset($data['starts_at']) ? Carbon::parse($data['starts_at']) : now();
        $endsAt = (clone $startsAt)->addDays($plan->days);

        StoreBoost::where('store_id', $store->id)
            ->where('status', 'active')
            ->update(['status' => 'expired']);

        $boost = StoreBoost::create([
            'store_id' => $store->id,
            'boost_plan_id' => $plan->id,
            'activated_by' => $request->user()->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => 'active',
        ]);

        $store->forceFill([
            'is_boosted' => true,
            'boost_expiry_date' => $endsAt,
        ])->save();

        return $this->successResponse('Boost activated successfully.', $boost->load('plan'));
    }

    public function cancel(StoreBoost $boost)
    {
        if ($boost->status === 'cancelled') {
            return $this->successResponse('Boost already cancelled.', $boost);
        }

        $boost->status = 'cancelled';
        $boost->ends_at = now();
        $boost->save();

        $this->refreshStoreBoostState($boost->store_id);

        return $this->successResponse('Boost cancelled successfully.', $boost->fresh('plan'));
    }

    protected function refreshStoreBoostState(int $storeId): void
    {
        $store = Store::find($storeId);

        if (! $store) {
            return;
        }

        $activeBoost = StoreBoost::where('store_id', $storeId)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->orderByDesc('ends_at')
            ->first();

        if ($activeBoost) {
            $store->forceFill([
                'is_boosted' => true,
                'boost_expiry_date' => $activeBoost->ends_at,
            ])->save();
        } else {
            $store->forceFill([
                'is_boosted' => false,
                'boost_expiry_date' => null,
            ])->save();
        }
    }
}
