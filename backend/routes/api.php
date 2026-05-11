<?php

use App\Http\Controllers\Api\AdminDashboardController;
use App\Http\Controllers\Api\AdminPlatformSettingController;
use App\Http\Controllers\Api\AdminStoreSubscriptionInquiryController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BoostPlanController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductCheckoutController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\StoreBoostController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\StoreEngagementController;
use App\Http\Controllers\Api\StorePaymentIntegrationController;
use App\Http\Controllers\Api\StoreSubscriptionController;
use App\Http\Controllers\Api\StorePurchaseInquiryController;
use App\Http\Controllers\Api\StoreOwnerNotificationController;
use App\Http\Controllers\Api\UserNotificationController;
use App\Http\Controllers\Api\StoreSubscriptionRazorpayController;
use App\Http\Controllers\Api\SubscriptionPlanController;
use App\Http\Controllers\Api\UtilityController;
use Illuminate\Support\Facades\Route;

// URL prefix is `api/v1/v1` (set in bootstrap/app.php).

/** Explicit OPTIONS so some proxies/CDNs that skip CORS middleware still return 204 for preflight. */
Route::options('auth/login', static fn () => response('', 204));
Route::options('auth/register', static fn () => response('', 204));
Route::options('auth/password', static fn () => response('', 204));

Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('auth/google', [AuthController::class, 'googleRedirect']);
Route::get('auth/google/callback', [AuthController::class, 'googleCallback']);

Route::get('utils/geo', [UtilityController::class, 'geoLookup']);
Route::get('utils/free-trial-days', [UtilityController::class, 'freeTrialDays']);
Route::get('categories', [CategoryController::class, 'index']);
Route::get('categories/hero-banners', [CategoryController::class, 'heroBanners']);
Route::get('category/{slug}', [CategoryController::class, 'show']);
Route::get('stores', [StoreController::class, 'listStores']);
Route::get('stores/following', [StoreController::class, 'followingStores']);
Route::get('stores/internal-links', [StoreController::class, 'publicStoreInternalLinks']);
Route::get('stores/location-links', [StoreController::class, 'publicLocationLinks']);
Route::get('search', [SearchController::class, 'search']);

Route::get('product/{id}/reviews', [ReviewController::class, 'listProductReviews']);
Route::get('store/{storeId}/reviews', [ReviewController::class, 'listStoreReviews']);

/** Streams `public/store-payment-qr/*` through PHP so CDNs do not return 422 on direct static image URLs. */
Route::get('stores/{store}/payment-qr-image', [StorePaymentIntegrationController::class, 'publicQrImage']);

/** Streams `storage/app/public/store-logos/*` — Hostinger CDN returns 422 on bare `/storage/store-logos/*.jpg`. */
Route::get('stores/{store}/logo-image', [StoreController::class, 'publicStoreLogo']);

Route::middleware('auth:api')->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/password', [AuthController::class, 'updatePassword']);

    Route::prefix('boost-plans')->group(function () {
        Route::get('/', [BoostPlanController::class, 'publicIndex']);

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/all', [BoostPlanController::class, 'index']);
            Route::post('/', [BoostPlanController::class, 'store']);
            Route::put('/{plan}', [BoostPlanController::class, 'update']);
            Route::delete('/{plan}', [BoostPlanController::class, 'destroy']);
        });
    });

    Route::get('admin/dashboard', AdminDashboardController::class)
        ->middleware('role:super_admin');

    Route::middleware('role:super_admin')->group(function () {
        Route::get('admin/settings/free-trial', [AdminPlatformSettingController::class, 'showFreeTrial']);
        Route::put('admin/settings/free-trial', [AdminPlatformSettingController::class, 'updateFreeTrial']);
        Route::get('admin/settings/subscription-addons', [AdminPlatformSettingController::class, 'showSubscriptionAddons']);
        Route::put('admin/settings/subscription-addons', [AdminPlatformSettingController::class, 'updateSubscriptionAddons']);
        Route::get('admin/settings/subscription-billing-discounts', [AdminPlatformSettingController::class, 'showSubscriptionBillingDiscounts']);
        Route::put('admin/settings/subscription-billing-discounts', [AdminPlatformSettingController::class, 'updateSubscriptionBillingDiscounts']);
        /** POST avoids some proxies/CDNs dropping JSON body on PUT. */
        Route::post('admin/settings/subscription-billing-discounts', [AdminPlatformSettingController::class, 'updateSubscriptionBillingDiscounts']);
    });

    Route::prefix('subscription-plans')->group(function () {
        Route::get('/', [SubscriptionPlanController::class, 'publicIndex']);
        Route::get('catalog', [SubscriptionPlanController::class, 'catalogIndex']);
        Route::get('addon-prices', [SubscriptionPlanController::class, 'publicAddonPrices']);

        Route::middleware('role:super_admin')->group(function () {
            Route::get('/all', [SubscriptionPlanController::class, 'index']);
            Route::post('/', [SubscriptionPlanController::class, 'store']);
            Route::put('/{plan}', [SubscriptionPlanController::class, 'update']);
            Route::delete('/{plan}', [SubscriptionPlanController::class, 'destroy']);
        });
    });

    Route::prefix('stores/{store}/subscription')->group(function () {
        Route::get('/', [StoreSubscriptionController::class, 'show']);
        Route::post('/', [StoreSubscriptionController::class, 'activate']);
        Route::post('addons', [StoreSubscriptionController::class, 'saveAddonSelection']);
        Route::post('upgrade-inquiry', [StoreSubscriptionController::class, 'createUpgradeInquiry']);
        Route::post('upgrade-inquiry/fulfill', [StoreSubscriptionController::class, 'fulfillUpgradeInquiry']);
        Route::post('razorpay-order', [StoreSubscriptionRazorpayController::class, 'createOrder']);
        Route::post('razorpay-verify', [StoreSubscriptionRazorpayController::class, 'verifyPayment']);
        Route::post('mock-complete', [StoreSubscriptionRazorpayController::class, 'mockComplete']);
    });

    Route::get('stores/{store}/payment-integration', [StorePaymentIntegrationController::class, 'show']);
    Route::post('stores/{store}/payment-integration', [StorePaymentIntegrationController::class, 'update']);
    Route::get('stores/{store}/purchase-inquiries', [StorePurchaseInquiryController::class, 'index']);

    Route::get('subscriptions', [StoreSubscriptionController::class, 'index'])
        ->middleware('role:super_admin');
    Route::delete('subscriptions/{subscription}', [StoreSubscriptionController::class, 'cancel'])
        ->middleware('role:super_admin');

    Route::get('admin/subscription-inquiries', [AdminStoreSubscriptionInquiryController::class, 'index'])
        ->middleware('role:super_admin');

    Route::prefix('stores/{store}/boosts')->group(function () {
        Route::get('/', [StoreBoostController::class, 'show']);
        Route::post('/', [StoreBoostController::class, 'activate']);
    });

    Route::get('boosts', [StoreBoostController::class, 'index'])->middleware('role:super_admin');
    Route::delete('boosts/{boost}', [StoreBoostController::class, 'cancel'])->middleware('role:super_admin');

    Route::post('store', [StoreController::class, 'createStore']);
    Route::get('my/stores', [StoreController::class, 'myStores']);
    Route::get('my/store-notifications', [StoreOwnerNotificationController::class, 'index']);
    Route::post('my/store-notifications/{notification}/read', [StoreOwnerNotificationController::class, 'markRead']);
    Route::delete('my/store-notifications/{notification}', [StoreOwnerNotificationController::class, 'destroy']);

    Route::get('my/follow-notifications', [UserNotificationController::class, 'index']);
    Route::post('my/follow-notifications/{notification}/read', [UserNotificationController::class, 'markRead']);
    Route::delete('my/follow-notifications/{notification}', [UserNotificationController::class, 'destroy']);
    Route::put('store/{id}', [StoreController::class, 'updateStore']);
    Route::post('store/{id}/grant-lifetime-access', [StoreController::class, 'grantLifetimeAccess'])
        ->middleware('role:super_admin');
    Route::delete('store/{id}', [StoreController::class, 'deleteStore']);

    Route::post('product', [ProductController::class, 'addProduct']);
    Route::put('product/{id}', [ProductController::class, 'updateProduct']);
    Route::delete('product/{id}', [ProductController::class, 'deleteProduct']);

    Route::post('service', [ServiceController::class, 'store']);
    Route::post('services', [ServiceController::class, 'store']);
    Route::put('service/{id}', [ServiceController::class, 'updateService']);
    Route::delete('service/{id}', [ServiceController::class, 'deleteService']);

    Route::middleware(['role:super_admin'])->group(function () {
        Route::post('categories', [CategoryController::class, 'store']);
        Route::delete('categories/{id}', [CategoryController::class, 'destroy']);
        Route::put('categories/{id}/banner', [CategoryController::class, 'updateBanner']);
        Route::put('admin/category/{id}/banner', [CategoryController::class, 'updateBanner']);
    });

    Route::post('product/{id}/reviews', [ReviewController::class, 'submitProductReview']);
    Route::post('store/{storeId}/reviews', [ReviewController::class, 'submitStoreReview']);
});

Route::get('store/{slug}', [StoreController::class, 'getStoreBySlug']);

Route::middleware('throttle:120,1')->group(function () {
    Route::post('stores/{store}/follow', [StoreEngagementController::class, 'toggleFollow']);
    Route::post('stores/{store}/like', [StoreEngagementController::class, 'toggleLike']);
    Route::post('stores/{store}/seen', [StoreEngagementController::class, 'recordSeen']);
});
Route::get('products/trending', [ProductController::class, 'trendingProducts']);
Route::get('products/{storeId}', [ProductController::class, 'getProductsByStore']);
Route::get('product/{id}', [ProductController::class, 'getProductById']);
Route::get('product/{product}/image', [ProductController::class, 'publicProductImage']);

Route::middleware('throttle:60,1')->group(function () {
    Route::post('product/{product}/checkout/razorpay-order', [ProductCheckoutController::class, 'createRazorpayOrder']);
    Route::post('product/{product}/checkout/razorpay-verify', [ProductCheckoutController::class, 'verifyRazorpayPayment']);
});
Route::get('services/{storeId}', [ServiceController::class, 'getServicesByStore']);
Route::get('service/{id}', [ServiceController::class, 'getServiceById']);
