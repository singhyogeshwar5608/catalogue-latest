<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'business_type',
        'is_active',
        'banner_image',
        'banner_images',
        'banner_title',
        'banner_subtitle',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'banner_images' => 'array',
    ];

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function bannerTemplates(): HasMany
    {
        return $this->hasMany(BannerTemplate::class);
    }
}
