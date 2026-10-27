<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Frontend mengirim gambar (poster / foto speaker) sebagai data-URL base64 yang sudah diperkecil.
 * Service ini memvalidasi di SERVER (jangan percaya frontend), menyimpan file ke disk "public",
 * dan mengembalikan path relatif yang bisa dipakai frontend, mis. "storage/posters/xxxx.jpg".
 *
 * Yang diizinkan:
 *   - data-URL PNG / JPEG / WebP (SVG sengaja ditolak karena bisa memuat script)
 *   - path gambar bawaan frontend "assets/images/...", atau file yang pernah di-upload ("storage/<dir>/...")
 */
class ImageStorage
{
    private const MIME_EXT = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];

    /**
     * @return string|null path untuk disimpan di DB, atau null bila tidak ada gambar yang dikirim
     *
     * @throws ValidationException
     */
    public function resolve(?string $value, string $dir, string $field, int $maxBytes): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        if (str_starts_with($value, 'data:')) {
            return $this->storeDataUrl($value, $dir, $field, $maxBytes);
        }

        $allowedPrefix = '#^(assets/images/|storage/'.preg_quote($dir, '#').'/)[A-Za-z0-9_\-./]+$#';

        if (! preg_match($allowedPrefix, $value) || str_contains($value, '..')) {
            throw ValidationException::withMessages([$field => 'Invalid image.']);
        }

        return $value;
    }

    /** Hapus file hasil upload lama (file bawaan di assets/ tidak pernah dihapus). */
    public function deleteIfUploaded(?string $path): void
    {
        if ($path && str_starts_with($path, 'storage/')) {
            Storage::disk('public')->delete(substr($path, strlen('storage/')));
        }
    }

    private function storeDataUrl(string $value, string $dir, string $field, int $maxBytes): string
    {
        if (! preg_match('#^data:(image/(?:png|jpeg|webp));base64,#', $value, $m)) {
            throw ValidationException::withMessages([$field => 'The image must be a PNG, JPEG or WebP file.']);
        }

        $binary = base64_decode(substr($value, strlen($m[0])), true);

        if ($binary === false || $binary === '') {
            throw ValidationException::withMessages([$field => 'The image data is not valid.']);
        }

        if (strlen($binary) > $maxBytes) {
            throw ValidationException::withMessages([$field => 'The image is too large (max '.round($maxBytes / 1048576, 1).' MB).']);
        }

        // Jangan percaya header MIME dari klien: periksa isi file sebenarnya.
        $info = @getimagesizefromstring($binary);

        if ($info === false || ! isset(self::MIME_EXT[$info['mime']]) || $info[0] > 6000 || $info[1] > 6000) {
            throw ValidationException::withMessages([$field => 'The file is not a valid image.']);
        }

        $relative = $dir.'/'.Str::uuid().'.'.self::MIME_EXT[$info['mime']];
        Storage::disk('public')->put($relative, $binary);

        return 'storage/'.$relative;
    }
}
