/** 3D / PNG brand glyphs for dashboard + storefront social rows (Cloudinary, no extra frame in UI). */

export const FACEBOOK_SOCIAL_BRAND_ICON_URL =
  'https://res.cloudinary.com/drcfeoi6p/image/upload/v1776588024/WhatsApp_Image_2026-04-18_at_7.57.41_PM-removebg-preview_ae69gr_rrc1pj.png';

export const INSTAGRAM_SOCIAL_BRAND_ICON_URL =
  'https://res.cloudinary.com/drcfeoi6p/image/upload/v1776588025/download-removebg-preview_yudvni.png';

export const YOUTUBE_SOCIAL_BRAND_ICON_URL =
  'https://res.cloudinary.com/drcfeoi6p/image/upload/v1776588025/YouTube_Logo_PNG_Free_Download___Transparent_Social_Media_Icon-removebg-preview_1_vxzauw.png';

export const LINKEDIN_SOCIAL_BRAND_ICON_URL =
  'https://res.cloudinary.com/drcfeoi6p/image/upload/v1776588025/LinkedIn_Icon-removebg-preview_1_cgphks.png';

export const SOCIAL_BRAND_ICON_URL_BY_PLATFORM = {
  facebook: FACEBOOK_SOCIAL_BRAND_ICON_URL,
  instagram: INSTAGRAM_SOCIAL_BRAND_ICON_URL,
  youtube: YOUTUBE_SOCIAL_BRAND_ICON_URL,
  linkedin: LINKEDIN_SOCIAL_BRAND_ICON_URL,
} as const;

export type SocialBrandPlatformKey = keyof typeof SOCIAL_BRAND_ICON_URL_BY_PLATFORM;

/** Single store page + store cards: all four PNGs same size (px). */
export const SOCIAL_BRAND_ICON_DISPLAY_PX = 30;

/** Dashboard “Social Media Links” row icons — same size as storefront (px). */
export const SOCIAL_BRAND_ICON_DASHBOARD_PX = 30;

/**
 * Horizontal gap between icons in one row (store + profile cards).
 * 20% of {@link SOCIAL_BRAND_ICON_DISPLAY_PX} (6px at size 30).
 */
export const SOCIAL_BRAND_ICON_ROW_GAP_PX = SOCIAL_BRAND_ICON_DISPLAY_PX * 0.2;
