<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;
use App\Support\NextCatalogCacheInvalidate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class AdminPlatformSettingController extends Controller
{
    public function showFreeTrial()
    {
        if (! Schema::hasTable('platform_settings')) {
            return $this->successResponse('Free trial days (default).', [
                'free_trial_days' => PlatformSetting::freeTrialDays(),
            ]);
        }

        return $this->successResponse('Free trial days retrieved.', [
            'free_trial_days' => PlatformSetting::freeTrialDays(),
        ]);
    }

    public function updateFreeTrial(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'free_trial_days' => 'required|integer|min:1|max:365',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if (! Schema::hasTable('platform_settings')) {
            return $this->errorResponse('Platform settings table is missing. Run migrations.', 503);
        }

        $days = (int) $validator->validated()['free_trial_days'];
        PlatformSetting::setInt(PlatformSetting::KEY_FREE_TRIAL_DAYS, $days);

        NextCatalogCacheInvalidate::stores();

        return $this->successResponse('Free trial duration updated.', [
            'free_trial_days' => PlatformSetting::freeTrialDays(),
        ]);
    }

    /** Global add-on prices (₹) when merchants pick payment gateway setup, QR, or assisted gateway integration. */
    public function showSubscriptionAddons()
    {
        return $this->successResponse('Subscription add-on charges retrieved.', PlatformSetting::subscriptionAddonChargesPayload());
    }

    public function updateSubscriptionAddons(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'payment_gateway_integration_inr' => 'required|integer|min:0|max:99999999',
            'qr_code_inr' => 'required|integer|min:0|max:99999999',
            'payment_gateway_help_inr' => 'required|integer|min:0|max:99999999',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if (! Schema::hasTable('platform_settings')) {
            return $this->errorResponse('Platform settings table is missing. Run migrations.', 503);
        }

        $d = $validator->validated();
        PlatformSetting::setRupees(PlatformSetting::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_INR, (int) $d['payment_gateway_integration_inr']);
        PlatformSetting::setRupees(PlatformSetting::KEY_SUBSCRIPTION_ADDON_QR_CODE_INR, (int) $d['qr_code_inr']);
        PlatformSetting::setRupees(PlatformSetting::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_HELP_INR, (int) $d['payment_gateway_help_inr']);

        return $this->successResponse('Subscription add-on charges updated.', PlatformSetting::subscriptionAddonChargesPayload());
    }

    /** Global percent discounts by billing term (1 month / 3 months / 1 year). */
    public function showSubscriptionBillingDiscounts()
    {
        return $this->successResponse('Subscription billing discounts retrieved.', PlatformSetting::subscriptionBillingDiscountsApiEnvelope());
    }

    public function updateSubscriptionBillingDiscounts(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'discount_1_month_pct' => 'required|integer|min:0|max:100',
            'discount_3_months_pct' => 'required|integer|min:0|max:100',
            'discount_1_year_pct' => 'required|integer|min:0|max:100',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if (! Schema::hasTable('platform_settings')) {
            return $this->errorResponse('Platform settings table is missing. Run migrations.', 503);
        }

        $d = $validator->validated();
        PlatformSetting::setPercent0to100(PlatformSetting::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_MONTH_PCT, (int) $d['discount_1_month_pct']);
        PlatformSetting::setPercent0to100(PlatformSetting::KEY_SUBSCRIPTION_BILLING_DISCOUNT_3_MONTHS_PCT, (int) $d['discount_3_months_pct']);
        PlatformSetting::setPercent0to100(PlatformSetting::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_YEAR_PCT, (int) $d['discount_1_year_pct']);

        return $this->successResponse('Subscription billing discounts updated.', PlatformSetting::subscriptionBillingDiscountsApiEnvelope());
    }

}
