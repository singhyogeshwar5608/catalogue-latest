<?php

namespace App\Http\Controllers\Api;

use App\Actions\ProvisionDefaultFreeStoreSubscription;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreSubscription;
use App\Models\SubscriptionPlan;
use App\Support\StoreNotificationRecorder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Throwable;

class StoreSubscriptionController extends Controller
{
    /**
     * Persist selected subscription add-ons (e.g. after checkout toggles). Updates store flags for dashboard access.
     */
    public function saveAddonSelection(Request $request, Store $store)
    {
        if ($request->user()->role !== 'super_admin' && (int) $request->user()->id !== (int) $store->user_id) {
            return $this->errorResponse('You are not authorized to update this store.', 403);
        }

        if (! Schema::hasColumn('stores', 'subscription_addons')) {
            return $this->errorResponse('Subscription add-ons are not available. Run database migrations.', 503);
        }

        $validator = Validator::make($request->all(), [
            'addon_payment_gateway' => 'required|boolean',
            'addon_qr_code' => 'required|boolean',
            'addon_payment_gateway_help' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $addonsPayload = [
            'payment_gateway' => $request->boolean('addon_payment_gateway'),
            'qr_code' => $request->boolean('addon_qr_code'),
            'payment_gateway_help' => $request->boolean('addon_payment_gateway_help'),
        ];

        $store->update(['subscription_addons' => $addonsPayload]);

        return $this->successResponse('Subscription add-on selection saved.', [
            'subscription_addons' => $addonsPayload,
        ]);
    }

    public function show(Request $request, Store $store)
    {
        if ($request->user()->role !== 'super_admin' && (int) $request->user()->id !== (int) $store->user_id) {
            return $this->errorResponse('You are not authorized to view this store subscription.', 403);
        }

        try {
            $activeSubscription = $store->storeSubscriptions()
                ->with('plan')
                ->active()
                ->first();

            if (! $activeSubscription) {
                ProvisionDefaultFreeStoreSubscription::run($store, (int) $request->user()->id);
                $activeSubscription = $store->storeSubscriptions()
                    ->with('plan')
                    ->active()
                    ->first();
            }

            return $this->successResponse('Store subscription retrieved successfully.', [
                'activeSubscription' => $activeSubscription,
            ]);
        } catch (Throwable $e) {
            Log::error('store subscription show', [
                'store_id' => $store->id,
                'message' => $e->getMessage(),
            ]);

            return $this->successResponse('Store subscription temporarily unavailable.', [
                'activeSubscription' => null,
            ]);
        }
    }

    public function activate(Request $request, Store $store)
    {
        if ($request->user()->role !== 'super_admin' && (int) $request->user()->id !== (int) $store->user_id) {
            return $this->errorResponse('You are not authorized to manage this store subscription.', 403);
        }

        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:subscription_plans,id',
            'starts_at' => 'nullable|date',
            'addon_payment_gateway' => 'sometimes|boolean',
            'addon_qr_code' => 'sometimes|boolean',
            'addon_payment_gateway_help' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        if (! $plan->is_active) {
            return $this->errorResponse('This subscription plan is not available.', 400);
        }

        $existingActive = $store->storeSubscriptions()->active()->with('plan')->first();

        if ($existingActive && (int) $existingActive->subscription_plan_id === (int) $plan->id) {
            return $this->errorResponse('You are already on this plan.', 409);
        }

        // While a paid plan period is active, the store cannot start another subscription (any plan) until it ends.
        if ($existingActive && $existingActive->plan && (int) $existingActive->plan->price > 0) {
            return $this->errorResponse(
                'You have an active paid subscription until '.$existingActive->ends_at->format('M j, Y').'. You can choose a new plan after that date.',
                409
            );
        }

        // Do not activate paid tiers without a completed payment flow; keeps the store on its current plan.
        if ((int) $plan->price > 0) {
            return $this->errorResponse(
                'Paid plans require completing checkout. Your active subscription will not change until payment succeeds.',
                402
            );
        }

        $addonsPayload = [
            'payment_gateway' => $request->boolean('addon_payment_gateway'),
            'qr_code' => $request->boolean('addon_qr_code'),
            'payment_gateway_help' => $request->boolean('addon_payment_gateway_help'),
        ];

        $subscription = DB::transaction(function () use ($existingActive, $plan, $store, $request, $addonsPayload) {
            if ($existingActive) {
                $existingActive->update([
                    'status' => 'cancelled',
                    'auto_renew' => false,
                    'ends_at' => Carbon::now(),
                ]);
            }

            $startsAt = $request->starts_at ? Carbon::parse($request->starts_at) : Carbon::now();

            if (isset($plan->duration_days) && $plan->duration_days > 0) {
                $endsAt = $startsAt->copy()->addDays($plan->duration_days);
            } else {
                $endsAt = $plan->billing_cycle === 'monthly'
                    ? $startsAt->copy()->addMonth()
                    : $startsAt->copy()->addYear();
            }

            $subscription = StoreSubscription::create([
                'store_id' => $store->id,
                'subscription_plan_id' => $plan->id,
                'price' => $plan->price,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => true,
                'metadata' => ['addons' => $addonsPayload],
                'activated_by' => auth()->id(),
            ]);

            if (Schema::hasColumn('stores', 'subscription_addons')) {
                $store->update(['subscription_addons' => $addonsPayload]);
            }

            return $subscription;
        });

        $subscription->load('plan');

        StoreNotificationRecorder::subscriptionActivated($store, $subscription);

        return $this->successResponse('Subscription activated successfully.', $subscription, 201);
    }

    public function cancel(StoreSubscription $subscription)
    {
        if ($subscription->status === 'cancelled') {
            return $this->errorResponse('Subscription is already cancelled.', 400);
        }

        $subscription->update([
            'status' => 'cancelled',
            'auto_renew' => false,
        ]);

        return $this->successResponse('Subscription cancelled successfully.', $subscription);
    }

    public function index()
    {
        $subscriptions = StoreSubscription::with(['store', 'plan', 'activatedBy'])
            ->orderByDesc('created_at')
            ->get();

        return $this->successResponse('Store subscriptions retrieved successfully.', $subscriptions);
    }
}
