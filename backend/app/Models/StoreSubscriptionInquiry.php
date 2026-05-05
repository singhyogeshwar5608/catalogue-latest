<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreSubscriptionInquiry extends Model
{
    protected $fillable = [
        'store_id',
        'store_subscription_id',
        'subscription_plan_id',
        'amount_paise',
        'currency',
        'razorpay_order_id',
        'razorpay_payment_id',
        'status',
        'addons',
        'store_owner',
        'store_snapshot',
    ];

    protected $casts = [
        'addons' => 'array',
        'store_owner' => 'array',
        'store_snapshot' => 'array',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(StoreSubscription::class, 'store_subscription_id');
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }
}

