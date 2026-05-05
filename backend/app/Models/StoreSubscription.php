<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class StoreSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'subscription_plan_id',
        'price',
        'status',
        'starts_at',
        'ends_at',
        'auto_renew',
        'metadata',
        'activated_by',
    ];

    protected $casts = [
        'price' => 'integer',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'auto_renew' => 'boolean',
        'metadata' => 'array',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function activatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'activated_by');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->where('ends_at', '>', Carbon::now());
    }
}
