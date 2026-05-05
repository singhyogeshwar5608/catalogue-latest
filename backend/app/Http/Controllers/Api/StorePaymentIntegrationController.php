<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Support\PaymentQrUrl;
use App\Models\StoreSubscription;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Persists each merchant's payment settings on {@see Store}: Razorpay key id/secret (encrypted), QR path, etc.
 * Product checkout reads these columns — not `.env` (100 stores = 100 DB rows, one platform pair in env).
 */
class StorePaymentIntegrationController extends Controller
{
    private const HELP_WHATSAPP_E164 = '917015150181';

    /**
     * Public binary response for the store’s saved payment QR (catalog + dashboard img tags).
     * Not behind `auth:api` — only serves the file already linked on the store row.
     */
    public function publicQrImage(Request $request, Store $store)
    {
        $path = $store->payment_qr_path;
        if (! is_string($path) || $path === '' || ! PaymentQrUrl::isPublicDiskPath($path)) {
            abort(404);
        }

        $normalized = str_replace('\\', '/', $path);
        $expectedPrefix = PaymentQrUrl::PUBLIC_PREFIX.'/'.$store->id.'/';
        if (! str_starts_with($normalized, $expectedPrefix)) {
            abort(404);
        }

        $full = public_path($path);
        if (! is_file($full)) {
            abort(404);
        }

        $mime = 'image/png';
        if (function_exists('finfo_open')) {
            $f = finfo_open(FILEINFO_MIME_TYPE);
            if ($f !== false) {
                $detected = finfo_file($f, $full);
                finfo_close($f);
                if (is_string($detected) && str_starts_with($detected, 'image/')) {
                    $mime = $detected;
                }
            }
        }

        return response()->file($full, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private function assertOwner(Request $request, Store $store): ?\Illuminate\Http\JsonResponse
    {
        if ($request->user()->role !== 'super_admin' && (int) $request->user()->id !== (int) $store->user_id) {
            return $this->errorResponse('You are not authorized to manage payment settings for this store.', 403);
        }

        return null;
    }

    /** Same rule as frontend `storeCanAccessPaymentIntegrationHub`: active paid period + payment add-on(s). */
    private function hasActivePaidSubscription(Store $store): bool
    {
        /** @var StoreSubscription|null $sub */
        $sub = $store->storeSubscriptions()
            ->with('plan')
            ->active()
            ->first();

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

    private function storeHasPaymentAddonSelection(Store $store): bool
    {
        $addons = $store->subscription_addons ?? [];

        return (bool) (($addons['payment_gateway'] ?? false)
            || ($addons['qr_code'] ?? false)
            || ($addons['payment_gateway_help'] ?? false));
    }

    private function assertPaymentHubEligible(Request $request, Store $store): ?\Illuminate\Http\JsonResponse
    {
        if ($request->user()->role === 'super_admin') {
            return null;
        }

        if (! $this->storeHasPaymentAddonSelection($store) || ! $this->hasActivePaidSubscription($store)) {
            return $this->errorResponse(
                'Payment settings unlock after you activate a paid subscription and enable payment add-ons.',
                403
            );
        }

        return null;
    }

    private function deletePaymentQrFile(?string $path): void
    {
        if (! is_string($path) || $path === '') {
            return;
        }

        if (PaymentQrUrl::isPublicDiskPath($path)) {
            $full = public_path($path);
            if (is_file($full)) {
                @unlink($full);
            }

            return;
        }

        try {
            Storage::disk('public')->delete($path);
        } catch (\Throwable) {
            // ignore
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Store $store): array
    {
        $addons = $store->subscription_addons ?? [];
        $secret = $store->razorpay_key_secret;

        return [
            'subscription_addons' => [
                'payment_gateway' => (bool) ($addons['payment_gateway'] ?? false),
                'qr_code' => (bool) ($addons['qr_code'] ?? false),
                'payment_gateway_help' => (bool) ($addons['payment_gateway_help'] ?? false),
            ],
            'razorpay_key_id' => $store->razorpay_key_id,
            'has_razorpay_secret' => is_string($secret) && $secret !== '',
            'payment_qr_url' => PaymentQrUrl::displayUrl($store->payment_qr_path, (int) $store->id),
            'help_whatsapp_e164' => self::HELP_WHATSAPP_E164,
            'help_whatsapp_url' => 'https://wa.me/'.self::HELP_WHATSAPP_E164,
        ];
    }

    public function show(Request $request, Store $store)
    {
        if ($deny = $this->assertOwner($request, $store)) {
            return $deny;
        }

        if ($deny = $this->assertPaymentHubEligible($request, $store)) {
            return $deny;
        }

        return $this->successResponse('Payment integration settings retrieved.', $this->payload($store));
    }

    public function update(Request $request, Store $store)
    {
        if ($deny = $this->assertOwner($request, $store)) {
            return $deny;
        }

        if ($deny = $this->assertPaymentHubEligible($request, $store)) {
            return $deny;
        }

        $addons = $store->subscription_addons ?? [];
        $allowPg = (bool) ($addons['payment_gateway'] ?? false);
        $allowQr = (bool) ($addons['qr_code'] ?? false);

        $validator = Validator::make($request->all(), [
            'razorpay_key_id' => 'sometimes|nullable|string|max:255',
            'razorpay_key_secret' => 'sometimes|nullable|string|max:512',
            'clear_razorpay_secret' => 'sometimes|boolean',
            'payment_qr' => 'sometimes|nullable|file|image|mimes:jpeg,jpg,png,webp|max:4096',
            /** JSON body: survives Next.js → Laravel rewrites better than multipart file uploads. */
            'payment_qr_base64' => 'sometimes|nullable|string|max:7000000',
            'payment_qr_mime' => 'sometimes|nullable|string|max:64',
            'remove_payment_qr' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if ($request->boolean('remove_payment_qr')) {
            if (! $allowQr) {
                return $this->errorResponse('QR code add-on is not enabled for this store.', 403);
            }
            $this->deletePaymentQrFile($store->payment_qr_path);
            $store->payment_qr_path = null;
        }

        if ($request->hasFile('payment_qr')) {
            if (! $allowQr) {
                return $this->errorResponse('QR code add-on is not enabled for this store.', 403);
            }

            $this->deletePaymentQrFile($store->payment_qr_path);

            $file = $request->file('payment_qr');
            $mime = $file->getMimeType() ?: '';
            $ext = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => strtolower((string) $file->getClientOriginalExtension()) ?: 'png',
            };
            if ($ext === 'jpeg') {
                $ext = 'jpg';
            }
            if (! in_array($ext, ['jpg', 'png', 'webp'], true)) {
                $ext = 'png';
            }

            $dirRelative = PaymentQrUrl::PUBLIC_PREFIX.'/'.$store->id;
            $dirAbsolute = public_path($dirRelative);
            if (! is_dir($dirAbsolute) && ! @mkdir($dirAbsolute, 0755, true) && ! is_dir($dirAbsolute)) {
                return $this->errorResponse('Could not create upload directory on the server.', 500);
            }

            $basename = Str::uuid()->toString().'.'.$ext;
            $file->move($dirAbsolute, $basename);
            $store->payment_qr_path = $dirRelative.'/'.$basename;
        } elseif (is_string($request->input('payment_qr_base64')) && trim($request->input('payment_qr_base64')) !== '') {
            if (! $allowQr) {
                return $this->errorResponse('QR code add-on is not enabled for this store.', 403);
            }

            $this->deletePaymentQrFile($store->payment_qr_path);

            $b64 = preg_replace('/^\s*data:image\/[^;]+;base64,/', '', trim($request->string('payment_qr_base64')->toString()));
            $binary = base64_decode($b64, true);
            if ($binary === false || $binary === '') {
                return $this->errorResponse('Invalid QR image (could not decode base64).', 422);
            }

            $maxBytes = 4096 * 1024;
            if (strlen($binary) > $maxBytes) {
                return $this->errorResponse('QR image must be 4 MB or smaller.', 422);
            }

            $info = @getimagesizefromstring($binary);
            if ($info === false) {
                return $this->errorResponse('The file is not a valid JPEG, PNG, or WebP image.', 422);
            }

            $mime = (string) ($info['mime'] ?? '');
            $ext = match ($mime) {
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                default => null,
            };
            if ($ext === null) {
                $hint = strtolower(trim((string) $request->input('payment_qr_mime', '')));
                $ext = match ($hint) {
                    'image/jpeg', 'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    default => null,
                };
            }
            if ($ext === null) {
                return $this->errorResponse('QR image must be JPEG, PNG, or WebP.', 422);
            }

            $dirRelative = PaymentQrUrl::PUBLIC_PREFIX.'/'.$store->id;
            $dirAbsolute = public_path($dirRelative);
            if (! is_dir($dirAbsolute) && ! @mkdir($dirAbsolute, 0755, true) && ! is_dir($dirAbsolute)) {
                return $this->errorResponse('Could not create upload directory on the server.', 500);
            }

            $basename = Str::uuid()->toString().'.'.$ext;
            $written = @file_put_contents($dirAbsolute.DIRECTORY_SEPARATOR.$basename, $binary);
            if ($written === false) {
                return $this->errorResponse('Could not write QR image to disk. Check `public/` permissions.', 500);
            }

            $store->payment_qr_path = $dirRelative.'/'.$basename;
        }

        if ($request->boolean('clear_razorpay_secret')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $store->razorpay_key_secret = null;
        }

        if ($request->exists('razorpay_key_id')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $store->razorpay_key_id = $request->input('razorpay_key_id') === ''
                ? null
                : $request->string('razorpay_key_id')->toString();
        }

        if ($request->exists('razorpay_key_secret')) {
            if (! $allowPg) {
                return $this->errorResponse('Payment gateway add-on is not enabled for this store.', 403);
            }
            $secret = $request->input('razorpay_key_secret');
            if (is_string($secret) && $secret !== '') {
                $store->razorpay_key_secret = $secret;
            }
        }

        try {
            $store->save();
        } catch (\Throwable $e) {
            report($e);

            return $this->errorResponse(
                'Could not save payment settings. Ensure `APP_KEY` is set in `backend/.env` (run `php artisan key:generate`) and the database is reachable.',
                500
            );
        }

        return $this->successResponse('Payment settings saved.', $this->payload($store->fresh()));
    }
}
