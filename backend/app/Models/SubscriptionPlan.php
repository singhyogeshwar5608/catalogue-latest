<?php

namespace App\Models;

use App\Support\SubscriptionPlanProductLimit;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'price',
        'billing_cycle',
        'duration_days',
        'billing_discount_tier',
        'display_order',
        'max_products',
        'is_popular',
        'is_active',
        'features',
        'description',
    ];

    protected $casts = [
        'price' => 'integer',
        'duration_days' => 'integer',
        'display_order' => 'integer',
        'is_popular' => 'boolean',
        'is_active' => 'boolean',
        'features' => 'array',
    ];

    /**
     * Effective cap by plan term (free / 1 mo / 3 mo / 1 yr). Stored DB value is not exposed on read.
     */
    protected function maxProducts(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value) => SubscriptionPlanProductLimit::resolve($this),
        );
    }

    public function storeSubscriptions(): HasMany
    {
        return $this->hasMany(StoreSubscription::class);
    }
}
