<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Store;
use App\Models\StorePurchaseInquiry;
use App\Support\PaymentQrUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

/**
 * Buyer → seller product checkout. Online pay uses only that store's Razorpay keys from the database
 * (`stores.razorpay_key_id` / `stores.razorpay_key_secret` via the payment integration dashboard).
 * Platform keys in `.env` are not used here — they are for Catelog subscription billing only.
 */
class ProductCheckoutController extends Controller
{
    /**
     * @return array{online_payment_available: bool, qr_payment_available: bool, payment_qr_url: ?string}
     */
    public static function buildPublicCheckoutPayload(Product $product, ?Request $request = null): array
    {
        $product->loadMissing('store');
        $store = $product->store;
        if (! $store) {
            return self::emptyCheckoutPayload();
        }

        // Allow store owners to test-buy their own products (useful for QA / payment integration checks).

        $store->loadMissing('activeSubscription.plan');

        if ($store->isPublicCatalogLocked() || ! self::storeHasPaidSubscriptionPeriod($store)) {
            return self::emptyCheckoutPayload();
        }

        if (! $product->is_active) {
            return self::emptyCheckoutPayload();
        }

        $addons = $store->subscription_addons ?? [];
        $pgAddon = (bool) ($addons['payment_gateway'] ?? false);
        $qrAddon = (bool) ($addons['qr_code'] ?? false);

        $keyId = is_string($store->razorpay_key_id) ? trim($store->razorpay_key_id) : '';
        $secret = $store->razorpay_key_secret;
        $secretOk = is_string($secret) && $secret !== '';

        $qrUrl = $qrAddon ? PaymentQrUrl::displayUrl($store->payment_qr_path, (int) $store->id) : null;

        $online = $pgAddon && $keyId !== '' && $secretOk;

        return [
            'online_payment_available' => $online,
            'qr_payment_available' => $qrAddon && is_string($qrUrl) && $qrUrl !== '',
            'payment_qr_url' => ($qrAddon && is_string($qrUrl) && $qrUrl !== '') ? $qrUrl : null,
        ];
    }

    /**
     * @return array{online_payment_available: bool, qr_payment_available: bool, payment_qr_url: null}
     */
    private static function emptyCheckoutPayload(): array
    {
        return [
            'online_payment_available' => false,
            'qr_payment_available' => false,
            'payment_qr_url' => null,
        ];
    }

    /**
     * True when the request has a valid Bearer JWT for the user who owns $store.
     */
    private static function bearerTokenUserOwnsStore(Request $request, Store $store): bool
    {
        $token = $request->bearerToken();
        if (! is_string($token) || $token === '') {
            return false;
        }

        try {
            JWTAuth::setToken($token);
            $user = JWTAuth::authenticate();
            if ($user === null) {
                return false;
            }

            return (int) $store->user_id === (int) $user->getAuthIdentifier();
        } catch (\Throwable) {
            return false;
        }
    }

    private static function storeHasPaidSubscriptionPeriod(Store $store): bool
    {
        $sub = $store->activeSubscription;
        if ($sub === null || $sub->status !== 'active') {
            return false;
        }

        $endsAt = $sub->ends_at;
        if ($endsAt === null || $endsAt->lte(now())) {
            return false;
        }

        $planPrice = (int) ($sub->plan?->price ?? 0);
        $subPrice = (int) ($sub->price ?? 0);
        if ($planPrice > 0 || $subPrice > 0) {
            return true;
        }

        $slug = strtolower(trim((string) ($sub->plan?->slug ?? '')));

        return $slug !== 'free' && $slug !== '';
    }

    public function createRazorpayOrder(Request $request, Product $product)
    {
        $validator = Validator::make($request->all(), [
            'purchase_option' => 'required|string|in:single,minimum,wholesale',
            'quantity' => 'sometimes|integer|min:1|max:99',
            'buyer' => 'required|array',
            'buyer.full_name' => 'required|string|min:2|max:160',
            'buyer.phone' => 'required|string|max:40',
            'buyer.email' => 'nullable|string|email|max:190',
            'buyer.address_line' => 'nullable|string|max:2000',
            'buyer.city' => 'nullable|string|max:120',
            'buyer.state' => 'nullable|string|max:120',
            'buyer.pincode' => 'nullable|string|max:24',
            'buyer.order_notes' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $phoneDigits = preg_replace('/\D+/', '', (string) $request->input('buyer.phone', ''));
        if (strlen($phoneDigits) < 10) {
            return $this->errorResponse('Validation failed.', 422, [
                'buyer.phone' => ['Enter a valid phone number with at least 10 digits.'],
            ]);
        }

        $product->loadMissing('store.activeSubscription.plan');
        $store = $product->store;
        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        if ($store->isPublicCatalogLocked()) {
            return $this->errorResponse('This store is not accepting orders right now.', 403);
        }

        if (! $product->is_active) {
            return $this->errorResponse('This product is not available for purchase.', 403);
        }

        // Allow store owners to purchase their own products (QA / testing).

        if (! self::storeHasPaidSubscriptionPeriod($store)) {
            return $this->errorResponse('Online payment is not available for this store.', 403);
        }

        $addons = $store->subscription_addons ?? [];
        if (! ($addons['payment_gateway'] ?? false)) {
            return $this->errorResponse('The seller has not enabled card or UPI checkout for this store.', 403);
        }

        $keyId = is_string($store->razorpay_key_id) ? trim($store->razorpay_key_id) : '';
        $secret = $store->razorpay_key_secret;
        if ($keyId === '' || ! is_string($secret) || $secret === '') {
            return $this->errorResponse(
                'The seller has not saved Razorpay API keys for this store yet. Open Payment integration in the seller dashboard and add Key ID and Key Secret.',
                403
            );
        }

        $option = $request->string('purchase_option')->toString();
        $singleQty = max(1, min(99, (int) $request->input('quantity', 1)));

        try {
            $rupees = $this->computeLineTotalInr($product, $option, $singleQty);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        }

        $amountPaise = max(100, (int) round($rupees * 100));
        $inquiryQty = $this->resolvedPurchaseQuantity($product, $option, $singleQty);

        $buyerForDb = [
            'full_name' => trim((string) $request->input('buyer.full_name')),
            'phone' => trim((string) $request->input('buyer.phone')),
            'email' => trim((string) $request->input('buyer.email', '')),
            'address_line' => trim((string) $request->input('buyer.address_line', '')),
            'city' => trim((string) $request->input('buyer.city', '')),
            'state' => trim((string) $request->input('buyer.state', '')),
            'pincode' => trim((string) $request->input('buyer.pincode', '')),
            'order_notes' => trim((string) $request->input('buyer.order_notes', '')),
        ];

        $receipt = 'p'.$product->id.'_'.Str::lower(Str::random(10));
        $receipt = substr($receipt, 0, 40);

        $response = Http::withBasicAuth($keyId, $secret)
            ->asJson()
            ->acceptJson()
            ->post('https://api.razorpay.com/v1/orders', [
                'amount' => $amountPaise,
                'currency' => 'INR',
                'receipt' => $receipt,
                'payment_capture' => 1,
                'notes' => [
                    'product_id' => (string) $product->id,
                    'purchase_option' => $option,
                    'store_id' => (string) $store->id,
                    'quantity' => $option === 'single' ? (string) $singleQty : '1',
                ],
            ]);

        if (! $response->successful()) {
            return $this->errorResponse(
                'Could not start payment. Please try again or contact the seller.',
                502,
                ['razorpay' => $response->json()]
            );
        }

        $json = $response->json();
        $rpOrderId = isset($json['id']) && is_string($json['id']) ? $json['id'] : null;
        if ($rpOrderId === null || $rpOrderId === '') {
            return $this->errorResponse(
                'Could not start payment. Please try again or contact the seller.',
                502,
                ['razorpay' => $json]
            );
        }

        try {
            StorePurchaseInquiry::query()->create([
                'store_id' => $store->id,
                'product_id' => $product->id,
                'quantity' => $inquiryQty,
                'amount_paise' => $amountPaise,
                'currency' => 'INR',
                'purchase_option' => $option,
                'razorpay_order_id' => $rpOrderId,
                'razorpay_payment_id' => null,
                'status' => 'pending',
                'buyer' => $buyerForDb,
                'paid_at' => null,
            ]);
        } catch (\Throwable) {
            // Avoid charging the buyer without a paper trail — surface a retryable error.
            return $this->errorResponse(
                'Could not record your order details. Please try again in a moment.',
                500
            );
        }

        return $this->successResponse('Order created.', [
            'razorpay_order_id' => $rpOrderId,
            'amount' => $amountPaise,
            'currency' => 'INR',
            'razorpay_key_id' => $keyId,
            'product_name' => $product->title,
            'store_name' => $store->name,
        ]);
    }

    public function verifyRazorpayPayment(Request $request, Product $product)
    {
        $validator = Validator::make($request->all(), [
            'razorpay_order_id' => 'required|string|max:255',
            'razorpay_payment_id' => 'required|string|max:255',
            'razorpay_signature' => 'required|string|max:512',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $product->loadMissing('store.activeSubscription.plan');
        $store = $product->store;
        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        if (! self::storeHasPaidSubscriptionPeriod($store)) {
            return $this->errorResponse('Verification failed.', 403);
        }

        $addons = $store->subscription_addons ?? [];
        if (! ($addons['payment_gateway'] ?? false)) {
            return $this->errorResponse('Verification failed.', 403);
        }

        // Allow store owners to verify payments for their own test purchases.

        $secret = $store->razorpay_key_secret;
        if (! is_string($secret) || $secret === '') {
            return $this->errorResponse('Verification failed.', 403);
        }

        $orderId = $request->string('razorpay_order_id')->toString();
        $paymentId = $request->string('razorpay_payment_id')->toString();
        $signature = $request->string('razorpay_signature')->toString();

        $expected = hash_hmac('sha256', $orderId.'|'.$paymentId, $secret);
        if (! hash_equals($expected, $signature)) {
            return $this->errorResponse('Invalid payment signature.', 400);
        }

        StorePurchaseInquiry::query()
            ->where('store_id', $store->id)
            ->where('product_id', $product->id)
            ->where('razorpay_order_id', $orderId)
            ->update([
                'razorpay_payment_id' => $paymentId,
                'status' => 'paid',
                'paid_at' => now(),
            ]);

        return $this->successResponse('Payment verified.', [
            'verified' => true,
            'razorpay_order_id' => $orderId,
            'razorpay_payment_id' => $paymentId,
        ]);
    }

    private function resolvedPurchaseQuantity(Product $product, string $option, int $singleQty): int
    {
        if ($option === 'single') {
            return max(1, min(99, $singleQty));
        }

        if ($option === 'minimum') {
            return max(1, (int) ($product->min_order_quantity ?? 1));
        }

        if ($option === 'wholesale') {
            $mo = (int) ($product->min_order_quantity ?? 2);
            $fallbackQty = max($mo, 2);
            $wMin = (int) ($product->wholesale_min_qty ?? $fallbackQty);

            return max(1, $wMin);
        }

        return 1;
    }

    /**
     * @throws \InvalidArgumentException
     */
    private function computeLineTotalInr(Product $product, string $option, int $singleQty = 1): float
    {
        $unit = (float) $product->price;
        $minQty = max(1, (int) ($product->min_order_quantity ?? 1));

        if ($option === 'single') {
            $q = max(1, min(99, $singleQty));

            return $unit * $q;
        }

        if ($option === 'minimum') {
            return $unit * $minQty;
        }

        if ($option === 'wholesale') {
            if (! $product->wholesale_enabled || $product->wholesale_price === null) {
                throw new \InvalidArgumentException('Wholesale ordering is not available for this product.');
            }

            $wPrice = (float) $product->wholesale_price;
            $mo = (int) ($product->min_order_quantity ?? 2);
            $fallbackQty = max($mo, 2);
            $wMin = (int) ($product->wholesale_min_qty ?? $fallbackQty);

            return $wPrice * max(1, $wMin);
        }

        throw new \InvalidArgumentException('Invalid purchase option.');
    }
}
