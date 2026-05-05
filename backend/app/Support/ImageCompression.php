<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

final class ImageCompression
{
    /**
     * @return array{binary:string, extension:string}|null
     */
    public static function fromUploadedFile(
        UploadedFile $file,
        int $maxWidth = 1600,
        int $quality = 82
    ): ?array {
        $raw = @file_get_contents($file->getRealPath() ?: '');
        if (! is_string($raw) || $raw === '') {
            return null;
        }

        $mime = $file->getMimeType();

        return self::compressBinary($raw, is_string($mime) ? $mime : null, $maxWidth, $quality);
    }

    /**
     * @return array{binary:string, extension:string}|null
     */
    public static function compressBinary(
        string $raw,
        ?string $mimeHint = null,
        int $maxWidth = 1600,
        int $quality = 82
    ): ?array {
        if ($raw === '' || ! function_exists('imagecreatefromstring')) {
            return null;
        }

        $src = @imagecreatefromstring($raw);
        if ($src === false) {
            return null;
        }

        $sourceW = imagesx($src);
        $sourceH = imagesy($src);
        if ($sourceW <= 0 || $sourceH <= 0) {
            imagedestroy($src);

            return null;
        }

        $targetW = $sourceW;
        $targetH = $sourceH;
        if ($maxWidth > 0 && $sourceW > $maxWidth) {
            $targetW = $maxWidth;
            $targetH = (int) round(($sourceH * $targetW) / $sourceW);
        }

        $canvas = $src;
        if ($targetW !== $sourceW || $targetH !== $sourceH) {
            $resized = imagecreatetruecolor($targetW, $targetH);
            if ($resized === false) {
                imagedestroy($src);

                return null;
            }

            // Keep alpha for PNG/WebP capable pipelines.
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
            imagefill($resized, 0, 0, $transparent);

            imagecopyresampled($resized, $src, 0, 0, 0, 0, $targetW, $targetH, $sourceW, $sourceH);
            imagedestroy($src);
            $canvas = $resized;
        }

        $mime = strtolower((string) $mimeHint);
        $isPngLike = str_contains($mime, 'png') || str_contains($mime, 'gif');
        $hasAlpha = self::hasAlphaChannel($canvas);

        $binary = null;
        $extension = 'jpg';

        // Prefer WebP when possible for better compression and alpha support.
        if (function_exists('imagewebp')) {
            ob_start();
            $ok = imagewebp($canvas, null, max(35, min(95, $quality)));
            $buffer = ob_get_clean();
            if ($ok && is_string($buffer) && $buffer !== '') {
                $binary = $buffer;
                $extension = 'webp';
            }
        }

        if ($binary === null && $isPngLike && $hasAlpha && function_exists('imagepng')) {
            ob_start();
            $ok = imagepng($canvas, null, 7);
            $buffer = ob_get_clean();
            if ($ok && is_string($buffer) && $buffer !== '') {
                $binary = $buffer;
                $extension = 'png';
            }
        }

        if ($binary === null && function_exists('imagejpeg')) {
            // Flatten transparency for JPEG.
            $jpegCanvas = imagecreatetruecolor($targetW, $targetH);
            if ($jpegCanvas !== false) {
                $white = imagecolorallocate($jpegCanvas, 255, 255, 255);
                imagefill($jpegCanvas, 0, 0, $white);
                imagecopy($jpegCanvas, $canvas, 0, 0, 0, 0, $targetW, $targetH);
                ob_start();
                $ok = imagejpeg($jpegCanvas, null, max(45, min(92, $quality)));
                $buffer = ob_get_clean();
                imagedestroy($jpegCanvas);
                if ($ok && is_string($buffer) && $buffer !== '') {
                    $binary = $buffer;
                    $extension = 'jpg';
                }
            }
        }

        imagedestroy($canvas);

        if (! is_string($binary) || $binary === '') {
            return null;
        }

        // Never return a larger payload than input.
        if (strlen($binary) >= strlen($raw)) {
            return null;
        }

        return [
            'binary' => $binary,
            'extension' => $extension,
        ];
    }

    private static function hasAlphaChannel(\GdImage $image): bool
    {
        $w = imagesx($image);
        $h = imagesy($image);
        $sampleStepX = max(1, (int) floor($w / 30));
        $sampleStepY = max(1, (int) floor($h / 30));

        for ($x = 0; $x < $w; $x += $sampleStepX) {
            for ($y = 0; $y < $h; $y += $sampleStepY) {
                $rgba = imagecolorat($image, $x, $y);
                $alpha = ($rgba & 0x7F000000) >> 24;
                if ($alpha > 0) {
                    return true;
                }
            }
        }

        return false;
    }
}
