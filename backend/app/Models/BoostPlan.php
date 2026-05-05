<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoostPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'days',
        'price',
        'priority_weight',
        'badge_label',
        'badge_color',
        'is_active',
    ];

    protected $casts = [
        'days' => 'integer',
        'price' => 'integer',
        'priority_weight' => 'integer',
        'is_active' => 'boolean',
    ];

    public function storeBoosts(): HasMany
    {
        return $this->hasMany(StoreBoost::class);
    }
}
