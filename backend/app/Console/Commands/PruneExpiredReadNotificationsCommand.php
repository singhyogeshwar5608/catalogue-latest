<?php

namespace App\Console\Commands;

use App\Support\PruneExpiredReadNotifications;
use Illuminate\Console\Command;

class PruneExpiredReadNotificationsCommand extends Command
{
    protected $signature = 'notifications:prune-expired-reads';

    protected $description = 'Remove in-app notifications older than 24 hours (by created_at)';

    public function handle(): int
    {
        PruneExpiredReadNotifications::prune();
        $this->comment('Pruned expired read notifications.');

        return self::SUCCESS;
    }
}
