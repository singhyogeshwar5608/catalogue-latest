<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StoreSubscription;
use App\Support\StoreNotificationRecorder;
use App\Support\StoreSubscriptionPeriod;
use App\Support\SubscriptionCheckoutPricing;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class StoreSubscriptionRazorpayController extends Controller
{
    private function markStoreVerifiedForPaidPlan(Store $store, SubscriptionPlan $plan): void
    {
        try {
            if (! Schema::hasColumn('stores', 'is_verified')) {
                return;
            }
            if ((int) $plan->price <= 0) {
                return;
            }
            if ((bool) $store->is_verified) {
                return;
            }
            $store->update(['is_verified' => true]);
        } catch (\Throwable) {
            // Best-effort: subscription activation should not fail if verification update fails.
        }
    }

    /**
     * Mock completion when enabled in config (defaults on; set `SUBSCRIPTION_MOCK_PAYMENT=false` to opt out),
     * or on `APP_ENV=local` when config is off.
     */
    private function subscriptionMockPaymentEnabled(): bool
    {
        if ((bool) config('services.razorpay.subscription_mock_payment')) {
            return true;
        }

        return app()->environment('local');
    }

    public function createOrder(Request $request, Store $store)
    {
        if (! $this->assertStoreOwner($request, $store)) {
            return $this->errorResponse('You are not authorized to manage this store subscription.', 403);
        }

        [$keyId, $secret] = $this->razorpayCredentials();
        if ($keyId === '' || $secret === '') {
            return $this->errorResponse(
                'Razorpay is not configured on the server. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the Laravel `.env` file (backend).',
                503
            );
        }

        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:subscription_plans,id',
            'addon_payment_gateway' => 'required|boolean',
            'addon_qr_code' => 'required|boolean',
            'addon_payment_gateway_help' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        if (! $plan->is_active) {
            return $this->errorResponse('This subscription plan is not available.', 400);
        }

        if ((int) $plan->price <= 0) {
            return $this->errorResponse('This plan does not require payment.', 400);
        }

        $existingActive = $store->storeSubscriptions()->active()->with('plan')->first();

        if ($existingActive && $existingActive->plan && (int) $existingActive->plan->price > 0) {
            return $this->errorResponse(
                'You have an active paid subscription until '.$existingActive->ends_at->format('M j, Y').'. You can choose a new plan after that date.',
                409
            );
        }

        $addonsPayload = [
            'payment_gateway' => $request->boolean('addon_payment_gateway'),
            'qr_code' => $request->boolean('addon_qr_code'),
            'payment_gateway_help' => $request->boolean('addon_payment_gateway_help'),
        ];

        $grossRupees = SubscriptionCheckoutPricing::grossSubtotalRupees($plan, $addonsPayload);
        $discountPct = SubscriptionCheckoutPricing::billingDiscountPercentForPlan($plan);
        $discountRupees = SubscriptionCheckoutPricing::discountRupeesFromGross($grossRupees, $discountPct);
        $taxableRupees = max(0, $grossRupees - $discountRupees);
        $gstRupees = SubscriptionCheckoutPricing::gstRupeesFromTaxableSubtotal($taxableRupees);
        $totalRupees = SubscriptionCheckoutPricing::checkoutTotalRupees($plan, $addonsPayload);
        $amountPaise = (int) ($totalRupees * 100);

        if ($amountPaise < 100) {
            return $this->errorResponse('Checkout amount is too small for Razorpay (minimum ₹1).', 400);
        }

        $receipt = 'sub_'.Str::lower(Str::random(12));

        $notes = [
            'store_id' => (string) $store->id,
            'plan_id' => (string) $plan->id,
            'addon_pg' => $addonsPayload['payment_gateway'] ? '1' : '0',
            'addon_qr' => $addonsPayload['qr_code'] ? '1' : '0',
            'addon_help' => $addonsPayload['payment_gateway_help'] ? '1' : '0',
            'discount_pct' => (string) $discountPct,
            'discount_rupees' => (string) $discountRupees,
        ];

        $response = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => $amountPaise,
                'currency' => 'INR',
                'receipt' => $receipt,
                'notes' => $notes,
            ]);

        if (! $response->successful()) {
            return $this->errorResponse(
                'Could not start payment with Razorpay. Check server logs or your Razorpay keys.',
                502
            );
        }

        $order = $response->json();

        return $this->successResponse('Razorpay order created.', [
            'key_id' => $keyId,
            'order_id' => $order['id'] ?? null,
            'amount' => isset($order['amount']) ? (int) $order['amount'] : $amountPaise,
            'currency' => $order['currency'] ?? 'INR',
            'plan_name' => $plan->name,
            'pricing' => [
                'gross_subtotal_rupees' => $grossRupees,
                'discount_percent' => $discountPct,
                'discount_rupees' => $discountRupees,
                'taxable_subtotal_rupees' => $taxableRupees,
                'gst_rupees' => $gstRupees,
                'total_rupees' => $totalRupees,
            ],
        ]);
    }

    public function verifyPayment(Request $request, Store $store)
    {
        if (! $this->assertStoreOwner($request, $store)) {
            return $this->errorResponse('You are not authorized to manage this store subscription.', 403);
        }

        [$keyId, $secret] = $this->razorpayCredentials();
        if ($keyId === '' || $secret === '') {
            return $this->errorResponse('Razorpay is not configured on the server.', 503);
        }

        $validator = Validator::make($request->all(), [
            'razorpay_order_id' => 'required|string|max:255',
            'razorpay_payment_id' => 'required|string|max:255',
            'razorpay_signature' => 'required|string|max:512',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $orderId = $request->string('razorpay_order_id')->toString();
        $paymentId = $request->string('razorpay_payment_id')->toString();
        $signature = $request->string('razorpay_signature')->toString();

        $expected = hash_hmac('sha256', $orderId.'|'.$paymentId, $secret);
        if (! hash_equals($expected, $signature)) {
            return $this->errorResponse('Invalid payment signature.', 400);
        }

        $orderResponse = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->get('https://api.razorpay.com/v1/orders/'.$orderId);

        if (! $orderResponse->successful()) {
            return $this->errorResponse('Could not confirm order with Razorpay.', 502);
        }

        $order = $orderResponse->json();
        $notes = is_array($order['notes'] ?? null) ? $order['notes'] : [];

        $noteStoreId = isset($notes['store_id']) ? (int) $notes['store_id'] : 0;
        if ($noteStoreId !== (int) $store->id) {
            return $this->errorResponse('This payment does not belong to your store.', 403);
        }

        $planId = isset($notes['plan_id']) ? (int) $notes['plan_id'] : 0;
        $plan = SubscriptionPlan::find($planId);
        if (! $plan || ! $plan->is_active || (int) $plan->price <= 0) {
            return $this->errorResponse('Invalid or expired checkout. Please start again.', 400);
        }

        $addonsPayload = [
            'payment_gateway' => ($notes['addon_pg'] ?? '') === '1',
            'qr_code' => ($notes['addon_qr'] ?? '') === '1',
            'payment_gateway_help' => ($notes['addon_help'] ?? '') === '1',
        ];

        $expectedRupees = SubscriptionCheckoutPricing::checkoutTotalRupees($plan, $addonsPayload);
        $expectedPaise = $expectedRupees * 100;
        $orderAmountPaise = isset($order['amount']) ? (int) $order['amount'] : 0;

        if ($orderAmountPaise !== $expectedPaise) {
            return $this->errorResponse('Payment amount does not match the selected plan.', 400);
        }

        $paymentResponse = Http::withBasicAuth($keyId, $secret)
            ->acceptJson()
            ->get('https://api.razorpay.com/v1/payments/'.$paymentId);

        if (! $paymentResponse->successful()) {
            return $this->errorResponse('Could not confirm payment with Razorpay.', 502);
        }

        $payment = $paymentResponse->json();
        $payOrderId = $payment['order_id'] ?? '';
        if ($payOrderId !== $orderId) {
            return $this->errorResponse('Payment does not match this order.', 400);
        }

        $status = strtolower((string) ($payment['status'] ?? ''));
        if (! in_array($status, ['authorized', 'captured'], true)) {
            return $this->errorResponse('Payment is not completed yet.', 400);
        }

        $existingByPayment = StoreSubscription::query()
            ->where('store_id', $store->id)
            ->where('metadata->razorpay_payment_id', $paymentId)
            ->first();

        if ($existingByPayment) {
            $existingByPayment->load('plan');

            return $this->successResponse('Subscription already activated for this payment.', $existingByPayment);
        }

        $existingActive = $store->storeSubscriptions()->active()->with('plan')->first();

        if ($existingActive && $existingActive->plan && (int) $existingActive->plan->price > 0) {
            return $this->errorResponse(
                'You already have an active paid subscription.',
                409
            );
        }

        $subscription = DB::transaction(function () use ($existingActive, $plan, $store, $request, $addonsPayload, $paymentId, $orderId) {
            if ($existingActive) {
                $existingActive->update([
                    'status' => 'cancelled',
                    'auto_renew' => false,
                    'ends_at' => Carbon::now(),
                ]);
            }

            $startsAt = Carbon::now();
            $trialDaysCarried = StoreSubscriptionPeriod::freeTrialCarryoverCalendarDays($store, $existingActive);
            $endsAt = StoreSubscriptionPeriod::endsAtForPaidActivation($store, $plan, $startsAt, $existingActive);

            $metadata = [
                'addons' => $addonsPayload,
                'razorpay_payment_id' => $paymentId,
                'razorpay_order_id' => $orderId,
                'trial_days_carried_over' => $trialDaysCarried,
            ];

            $subscription = StoreSubscription::create([
                'store_id' => $store->id,
                'subscription_plan_id' => $plan->id,
                'price' => $plan->price,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => true,
                'metadata' => $metadata,
                'activated_by' => auth()->id(),
            ]);

            if (Schema::hasColumn('stores', 'subscription_addons')) {
                $store->update(['subscription_addons' => $addonsPayload]);
            }

            $this->markStoreVerifiedForPaidPlan($store, $plan);

            return $subscription;
        });

        $subscription->load('plan');

        StoreNotificationRecorder::subscriptionActivated($store, $subscription);

        return $this->successResponse('Subscription activated successfully.', $subscription, 201);
    }

    /**
     * Testing-only: same subscription activation as {@see verifyPayment} without calling Razorpay.
     * Enabled per {@see subscriptionMockPaymentEnabled} (mock is on by default until disabled in `.env`).
     */
    public function mockComplete(Request $request, Store $store)
    {
        if (! $this->subscriptionMockPaymentEnabled()) {
            return $this->errorResponse(
                'Subscription mock payment is disabled (SUBSCRIPTION_MOCK_PAYMENT=false on this host and not APP_ENV=local). Set SUBSCRIPTION_MOCK_PAYMENT=true or remove the line to use the default (on), or run local Laravel. Then `php artisan config:clear` if you use config cache.',
                403
            );
        }

        if (! $this->assertStoreOwner($request, $store)) {
            return $this->errorResponse('You are not authorized to manage this store subscription.', 403);
        }

        $validator = Validator::make($request->all(), [
            'plan_id' => 'required|exists:subscription_plans,id',
            'addon_payment_gateway' => 'required|boolean',
            'addon_qr_code' => 'required|boolean',
            'addon_payment_gateway_help' => 'required|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan = SubscriptionPlan::findOrFail($request->plan_id);

        if (! $plan->is_active) {
            return $this->errorResponse('This subscription plan is not available.', 400);
        }

        if ((int) $plan->price <= 0) {
            return $this->errorResponse('This plan does not require payment.', 400);
        }

        $existingActive = $store->storeSubscriptions()->active()->with('plan')->first();

        if ($existingActive && $existingActive->plan && (int) $existingActive->plan->price > 0) {
            return $this->errorResponse(
                'You have an active paid subscription until '.$existingActive->ends_at->format('M j, Y').'. You can choose a new plan after that date.',
                409
            );
        }

        $addonsPayload = [
            'payment_gateway' => $request->boolean('addon_payment_gateway'),
            'qr_code' => $request->boolean('addon_qr_code'),
            'payment_gateway_help' => $request->boolean('addon_payment_gateway_help'),
        ];

        $paymentId = 'mock_pay_'.Str::uuid()->toString();
        $orderId = 'mock_order_'.Str::uuid()->toString();

        $existingByPayment = StoreSubscription::query()
            ->where('store_id', $store->id)
            ->where('metadata->razorpay_payment_id', $paymentId)
            ->first();

        if ($existingByPayment) {
            $existingByPayment->load('plan');

            return $this->successResponse('Subscription already activated for this payment.', $existingByPayment);
        }

        $subscription = DB::transaction(function () use ($existingActive, $plan, $store, $addonsPayload, $paymentId, $orderId) {
            if ($existingActive) {
                $existingActive->update([
                    'status' => 'cancelled',
                    'auto_renew' => false,
                    'ends_at' => Carbon::now(),
                ]);
            }

            $startsAt = Carbon::now();
            $trialDaysCarried = StoreSubscriptionPeriod::freeTrialCarryoverCalendarDays($store, $existingActive);
            $endsAt = StoreSubscriptionPeriod::endsAtForPaidActivation($store, $plan, $startsAt, $existingActive);

            $metadata = [
                'addons' => $addonsPayload,
                'razorpay_payment_id' => $paymentId,
                'razorpay_order_id' => $orderId,
                'mock_payment' => true,
                'mock_completed_at' => Carbon::now()->toIso8601String(),
                'trial_days_carried_over' => $trialDaysCarried,
            ];

            $subscription = StoreSubscription::create([
                'store_id' => $store->id,
                'subscription_plan_id' => $plan->id,
                'price' => $plan->price,
                'status' => 'active',
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => true,
                'metadata' => $metadata,
                'activated_by' => auth()->id(),
            ]);

            if (Schema::hasColumn('stores', 'subscription_addons')) {
                $store->update(['subscription_addons' => $addonsPayload]);
            }

            $this->markStoreVerifiedForPaidPlan($store, $plan);

            return $subscription;
        });

        $subscription->load('plan');

        StoreNotificationRecorder::subscriptionActivated($store, $subscription);

        return $this->successResponse('Subscription activated (mock payment).', $subscription, 201);
    }

    private function assertStoreOwner(Request $request, Store $store): bool
    {
        return $request->user()->role === 'super_admin'
            || (int) $request->user()->id === (int) $store->user_id;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function razorpayCredentials(): array
    {
        $keyId = (string) (config('services.razorpay.key_id') ?? '');
        $secret = (string) (config('services.razorpay.key_secret') ?? '');

        return [trim($keyId), trim($secret)];
    }

}
