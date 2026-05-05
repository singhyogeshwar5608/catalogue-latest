<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

/**
 * Replacement for `php artisan storage:link` on hosts where PHP's `symlink()` exists
 * but Laravel's stock command falls back to `exec('ln -s …')` — inside the
 * `Illuminate\Filesystem` namespace that becomes `exec()` → wrong function and
 * fails with "Call to undefined function Illuminate\Filesystem\exec()", or `exec`
 * is disabled entirely.
 *
 * This command uses only {@see symlink()} with an explicit global call.
 */
class LinkPublicStorageCommand extends Command
{
    protected $signature = 'link:public-storage {--force : Remove existing public/storage symlink and recreate}';

    protected $description = 'Symlink public/storage → storage/app/public without using PHP exec()';

    public function handle(): int
    {
        $target = storage_path('app/public');
        $link = public_path('storage');

        if (! is_dir($target)) {
            $this->warn('Target directory missing; creating: '.$target);
            if (! @mkdir($target, 0755, true) && ! is_dir($target)) {
                $this->error('Could not create '.$target);

                return self::FAILURE;
            }
        }

        $targetReal = realpath($target) ?: $target;

        if (file_exists($link) || is_link($link)) {
            if (is_link($link)) {
                if (! $this->option('force')) {
                    $this->info('Symlink already exists: '.$link.' → '.readlink($link));

                    return self::SUCCESS;
                }
                if (! @unlink($link)) {
                    $this->error('Could not remove existing symlink: '.$link);

                    return self::FAILURE;
                }
            } elseif (is_dir($link)) {
                $this->error($link.' is a real directory, not a symlink. Remove or rename it, then run again.');

                return self::FAILURE;
            } else {
                if (! $this->option('force')) {
                    $this->error($link.' exists. Use --force to replace, or remove it manually.');

                    return self::FAILURE;
                }
                @unlink($link);
            }
        }

        if (! function_exists('symlink')) {
            $this->error('PHP function symlink() is disabled on this server.');
            $this->newLine();
            $this->line('Create the link once over SSH from your Laravel <fg=cyan>public</> directory, e.g.:');
            $this->line('  <fg=yellow>cd '.dirname($link).' && ln -sfn ../storage/app/public storage</>');

            return self::FAILURE;
        }

        if (@\symlink($targetReal, $link)) {
            $this->info('Linked <fg=cyan>'.$link.'</> → <fg=cyan>'.$targetReal.'</>');

            return self::SUCCESS;
        }

        $this->error('symlink() failed (check permissions on public/ and storage/app/public).');
        $this->newLine();
        $this->line('Try SSH from <fg=cyan>public</>:');
        $this->line('  <fg=yellow>ln -sfn ../storage/app/public storage</>');

        return self::FAILURE;
    }
}
