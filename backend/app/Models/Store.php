<?php

namespace App\Models;

use App\Support\StoreLogoUrl;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Store extends Model
{
    /**
     * @param  mixed  $value
     * @param  string|null  $field
     */
    public function resolveRouteBinding($value, $field = null)
    {
        if ($field !== null) {
            return parent::resolveRouteBinding($value, $field);
        }

        if (is_numeric($value)) {
            return parent::resolveRouteBinding($value, $field);
        }

        return static::query()
            ->where(function ($q) use ($value) {
                $q->where('username', $value)->orWhere('slug', $value);
            })
            ->firstOrFail();
    }

    protected $fillable = [
        'user_id',
        'category_id',
        'name',
        'slug',
        'username',
        'logo',
        'banner',
        'phone',
        'email',
        'whatsapp',
        'show_phone',
        'facebook_url',
        'instagram_url',
        'youtube_url',
        'linkedin_url',
        'address',
        'location',
        'state',
        'district',
        'latitude',
        'longitude',
        'description',
        'seo_keywords',
        'short_description',
        'layout_type',
        'theme',
        'rating',
        'total_reviews',
        'is_verified',
        'is_boosted',
        'boost_expiry_date',
        'is_active',
        'trial_ends_at',
        'subscription_addons',
        'lifetime_access',
        'payment_qr_path',
        'razorpay_key_id',
        'razorpay_key_secret',
    ];

    protected $hidden = [
        'razorpay_key_secret',
        'razorpay_key_id',
        'payment_qr_path',
    ];

    protected $casts = [
        'seen_count' => 'integer',
        'rating' => 'decimal:1',
        'total_reviews' => 'integer',
        'is_verified' => 'boolean',
        'is_boosted' => 'boolean',
        'is_active' => 'boolean',
        'show_phone' => 'boolean',
        'boost_expiry_date' => 'date',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'subscription_addons' => 'array',
        'lifetime_access' => 'boolean',
        'razorpay_key_secret' => 'encrypted',
    ];

    /**
     * Trial end is always `created_at` plus the *current* platform `free_trial_days` setting.
     * The `trial_ends_at` column may hold an older snapshot (e.g. 5 days at signup); reads ignore it
     * so shortening the global trial (1 day) applies to every store and expired trials stay expired.
     */
    protected function trialEndsAt(): Attribute
    {
        return Attribute::make(
            get: function (?string $_unused): ?CarbonInterface {
                if (! $this->exists || $this->created_at === null) {
                    return null;
                }

                return $this->created_at->copy()->addDays(PlatformSetting::freeTrialDays());
            },
            set: function (mixed $value): array {
                if ($value === null) {
                    return ['trial_ends_at' => null];
                }
                if ($value instanceof \DateTimeInterface) {
                    return ['trial_ends_at' => $value];
                }

                return ['trial_ends_at' => $value];
            }
        );
    }

    /**
     * Replace disk `/storage/store-logos/*` URLs with an API stream URL so CDNs do not return 422.
     */
    protected function logo(): Attribute
    {
        return Attribute::make(
            get: function (?string $value): ?string {
                if ($value === null || $value === '') {
                    return $value;
                }
                $id = (int) ($this->getAttributes()['id'] ?? 0);
                if ($id <= 0) {
                    return $value;
                }

                return StoreLogoUrl::toStreamUrl($value, $id) ?? $value;
            },
            set: function (mixed $value): array {
                if ($value === null || (is_string($value) && $value === '')) {
                    return ['logo' => null];
                }

                return ['logo' => is_string($value) ? $value : (string) $value];
            }
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function boosts(): HasMany
    {
        return $this->hasMany(StoreBoost::class);
    }

    public function activeBoost(): HasOne
    {
        // Temporarily disable latestOfMany to avoid SQLite issues
        return $this->hasOne(StoreBoost::class)
            ->where('status', 'active')
            ->orderBy('ends_at', 'desc');
    }

    public function storeSubscriptions(): HasMany
    {
        return $this->hasMany(StoreSubscription::class);
    }

    public function storeNotifications(): HasMany
    {
        return $this->hasMany(StoreNotification::class);
    }

    public function subscriptionInquiries(): HasMany
    {
        return $this->hasMany(StoreSubscriptionInquiry::class);
    }

    public function activeSubscription(): HasOne
    {
        // Temporarily disable latestOfMany to avoid SQLite issues
        return $this->hasOne(StoreSubscription::class)
            ->where('status', 'active')
            ->where('ends_at', '>', now())
            ->orderBy('ends_at', 'desc');
    }

    /**
     * Active subscription on a paid (non-`free` slug) plan — same idea as `isPaidSubscriptionActive` on the Next app.
     */
    public function hasActivePaidPlan(): bool
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('store_subscriptions')
            || ! \Illuminate\Support\Facades\Schema::hasTable('subscription_plans')) {
            return false;
        }

        $sub = $this->activeSubscription()->with('plan')->first();
        if (! $sub || ! $sub->plan) {
            return false;
        }

        $slug = strtolower((string) ($sub->plan->slug ?? ''));

        return $slug !== 'free';
    }

    /**
     * Check if store has lifetime access.
     */
    public function hasLifetimeAccess(): bool
    {
        return (bool) $this->lifetime_access;
    }

    /**
     * Public catalog should be hidden for visitors when trial ended and there is no paid plan.
     */
    public function isPublicCatalogLocked(): bool
    {
        if ($this->hasLifetimeAccess()) {
            return false;
        }

        if ($this->hasActivePaidPlan()) {
            return false;
        }

        $trialEnd = $this->trial_ends_at;
        if ($trialEnd === null) {
            return false;
        }

        return $trialEnd->lte(now());
    }
}
