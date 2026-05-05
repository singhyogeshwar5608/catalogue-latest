<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PlatformSetting extends Model
{
    public const KEY_FREE_TRIAL_DAYS = 'free_trial_days';

    /** Extra ₹ added at checkout when a merchant enables these options (stored as whole rupees, 0 allowed). */
    public const KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_INR = 'subscription_addon_payment_gateway_inr';

    public const KEY_SUBSCRIPTION_ADDON_QR_CODE_INR = 'subscription_addon_qr_code_inr';

    public const KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_HELP_INR = 'subscription_addon_payment_gateway_help_inr';

    /** Percent off (0–100) for each billing commitment length; used when merchants subscribe for that term. */
    public const KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_MONTH_PCT = 'subscription_billing_discount_1_month_pct';

    public const KEY_SUBSCRIPTION_BILLING_DISCOUNT_3_MONTHS_PCT = 'subscription_billing_discount_3_months_pct';

    public const KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_YEAR_PCT = 'subscription_billing_discount_1_year_pct';

    /** Default when the row is missing or invalid (keep in sync with `DEFAULT_FREE_TRIAL_DAYS` in `src/lib/freeTrialDays.ts`). */
    public const DEFAULT_FREE_TRIAL_DAYS = 5;

    /** Shared cache key so all PHP workers see the same value; cleared when `free_trial_days` is updated. */
    private const CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED = 'platform_settings.resolved.free_trial_days_int';

    protected $fillable = [
        'key',
        'value',
    ];

    public static function intValue(string $key, int $default): int
    {
        if (! Schema::hasTable('platform_settings')) {
            return $default;
        }

        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null || $row->value === '') {
            return $default;
        }
        $n = (int) $row->value;

        return $n > 0 ? $n : $default;
    }

    public static function freeTrialDays(): int
    {
        $fromDb = static function (): int {
            try {
                return self::intValue(self::KEY_FREE_TRIAL_DAYS, self::DEFAULT_FREE_TRIAL_DAYS);
            } catch (\Throwable) {
                // DB down or `platform_settings` missing — any Store#trial_ends_at JSON must not 503 the whole list.
                return self::DEFAULT_FREE_TRIAL_DAYS;
            }
        };

        try {
            return (int) Cache::remember(
                self::CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED,
                3600,
                $fromDb
            );
        } catch (\Throwable) {
            // Redis unreachable / CACHE_STORE=redis without a server: fall back to DB; then safe default.
            return $fromDb();
        }
    }

    public static function setInt(string $key, int $value): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value]
        );

        if ($key === self::KEY_FREE_TRIAL_DAYS) {
            try {
                Cache::forget(self::CACHE_KEY_FREE_TRIAL_DAYS_RESOLVED);
            } catch (\Throwable) {
                /* ignore if cache driver is down */
            }
        }
    }

    /** Non-negative rupee amount (0 if missing or invalid). */
    public static function rupeesOrZero(string $key): int
    {
        if (! Schema::hasTable('platform_settings')) {
            return 0;
        }

        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null || $row->value === '') {
            return 0;
        }
        $n = (int) $row->value;

        return max(0, $n);
    }

    /** Persist rupee amount ≥ 0 (used for subscription add-on prices). */
    public static function setRupees(string $key, int $value): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        $n = max(0, $value);
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => (string) $n]
        );
    }

    /** Integer percent 0–100 (0 if missing or invalid). */
    public static function percent0to100(string $key): int
    {
        if (! Schema::hasTable('platform_settings')) {
            return 0;
        }

        $row = static::query()->where('key', $key)->first();
        if (! $row || $row->value === null || $row->value === '') {
            return 0;
        }

        return max(0, min(100, (int) $row->value));
    }

    public static function setPercent0to100(string $key, int $value): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        $n = max(0, min(100, $value));
        $now = now();

        // Use Query Builder so `value` and `updated_at` always persist (some stacks mis-handle Eloquent updateOrCreate on `key`).
        if (DB::table('platform_settings')->where('key', $key)->exists()) {
            DB::table('platform_settings')->where('key', $key)->update([
                'value' => (string) $n,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('platform_settings')->insert([
                'key' => $key,
                'value' => (string) $n,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * @return array{discount_1_month_pct: int, discount_3_months_pct: int, discount_1_year_pct: int}
     */
    public static function subscriptionBillingDiscountsPayload(): array
    {
        if (! Schema::hasTable('platform_settings')) {
            return [
                'discount_1_month_pct' => 0,
                'discount_3_months_pct' => 0,
                'discount_1_year_pct' => 0,
            ];
        }

        return [
            'discount_1_month_pct' => self::percent0to100(self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_MONTH_PCT),
            'discount_3_months_pct' => self::percent0to100(self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_3_MONTHS_PCT),
            'discount_1_year_pct' => self::percent0to100(self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_YEAR_PCT),
        ];
    }

    /**
     * Payload for super-admin API: percents plus raw `platform_settings` rows and which DB Laravel is writing to
     * (helps when phpMyAdmin shows a different database or SQLite vs MySQL confusion).
     *
     * @return array<string, mixed>
     */
    public static function subscriptionBillingDiscountsApiEnvelope(): array
    {
        $base = self::subscriptionBillingDiscountsPayload();
        $keys = [
            self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_MONTH_PCT,
            self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_3_MONTHS_PCT,
            self::KEY_SUBSCRIPTION_BILLING_DISCOUNT_1_YEAR_PCT,
        ];

        $rows = [];
        if (Schema::hasTable('platform_settings')) {
            $rows = DB::table('platform_settings')
                ->whereIn('key', $keys)
                ->orderBy('key')
                ->get(['key', 'value', 'updated_at'])
                ->map(static function ($r) {
                    return [
                        'key' => $r->key,
                        'value' => $r->value,
                        'updated_at' => $r->updated_at !== null ? (string) $r->updated_at : null,
                    ];
                })
                ->all();
        }

        $default = (string) config('database.default');
        $conn = config("database.connections.{$default}", []);
        $dbIdentity = [
            'connection' => $default,
            'driver' => (string) ($conn['driver'] ?? ''),
            'database' => (string) ($conn['database'] ?? ''),
        ];

        return array_merge($base, [
            '_persisted_rows' => $rows,
            '_laravel_database' => $dbIdentity,
        ]);
    }

    /**
     * @return array{payment_gateway_integration_inr: int, qr_code_inr: int, payment_gateway_help_inr: int}
     */
    public static function subscriptionAddonChargesPayload(): array
    {
        if (! Schema::hasTable('platform_settings')) {
            return [
                'payment_gateway_integration_inr' => 0,
                'qr_code_inr' => 0,
                'payment_gateway_help_inr' => 0,
            ];
        }

        return [
            'payment_gateway_integration_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_INR),
            'qr_code_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_QR_CODE_INR),
            'payment_gateway_help_inr' => self::rupeesOrZero(self::KEY_SUBSCRIPTION_ADDON_PAYMENT_GATEWAY_HELP_INR),
        ];
    }
}
