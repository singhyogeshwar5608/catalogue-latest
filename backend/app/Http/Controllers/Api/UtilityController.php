<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Support\Facades\Http;

class UtilityController extends Controller
{
    public function geoLookup()
    {
        $endpoint = config('services.ipapi.url');

        try {
            $response = Http::timeout(5)->get($endpoint);

            if ($response->failed()) {
                return $this->errorResponse('Unable to fetch location.', 502, [
                    'reason' => $response->body(),
                ]);
            }

            return $this->successResponse('Location fetched successfully.', $response->json());
        } catch (\Throwable $e) {
            return $this->errorResponse('Unable to fetch location.', 500, [
                'reason' => $e->getMessage(),
            ]);
        }
    }

    /** Public: global free-trial length (days) from `platform_settings`. */
    public function freeTrialDays()
    {
        return $this->successResponse('Free trial days.', [
            'free_trial_days' => PlatformSetting::freeTrialDays(),
        ]);
    }
}
