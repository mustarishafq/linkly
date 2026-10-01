<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** @var array<string, string> */
    private array $tables = [
        'ShortLink' => 'entity_shortlink',
        'Campaign' => 'entity_campaign',
        'CustomDomain' => 'entity_customdomain',
        'LinkTree' => 'entity_linktree',
    ];

    public function up(): void
    {
        $owners = $this->ownersFromAuditLog();

        foreach ($this->tables as $entity => $table) {
            if (! Schema::hasTable($table)) {
                continue;
            }

            $rows = DB::table($table)->select('id', 'payload')->get();

            foreach ($rows as $row) {
                $payload = is_string($row->payload) ? json_decode($row->payload, true) : (array) $row->payload;
                if (! is_array($payload) || ! empty($payload['owner_user_id'])) {
                    continue;
                }

                $ownerId = $owners[$entity.':'.$row->id] ?? null;
                if (! $ownerId) {
                    continue;
                }

                $payload['owner_user_id'] = $ownerId;

                DB::table($table)->where('id', $row->id)->update([
                    'payload' => json_encode($payload),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Ownership backfill is not reversed; removing it would expose other users' records again.
    }

    /**
     * @return array<string, int>
     */
    private function ownersFromAuditLog(): array
    {
        if (! Schema::hasTable('audit_logs')) {
            return [];
        }

        $owners = [];
        $logs = DB::table('audit_logs')
            ->select('actor_user_id', 'action', 'details')
            ->whereIn('action', ['entity_created', 'entity_bulk_created'])
            ->orderBy('id')
            ->get();

        foreach ($logs as $log) {
            if (! $log->actor_user_id) {
                continue;
            }

            $details = is_string($log->details) ? json_decode($log->details, true) : (array) $log->details;
            if (! is_array($details)) {
                continue;
            }

            $entity = (string) ($details['entity'] ?? '');
            if (! isset($this->tables[$entity])) {
                continue;
            }

            $ownerId = (int) $log->actor_user_id;
            if ($log->action === 'entity_created' && isset($details['entity_id'])) {
                $owners[$entity.':'.$details['entity_id']] ??= $ownerId;
            }

            if ($log->action === 'entity_bulk_created') {
                foreach ($details['entity_ids'] ?? [] as $entityId) {
                    $owners[$entity.':'.$entityId] ??= $ownerId;
                }
            }
        }

        return $owners;
    }
};
