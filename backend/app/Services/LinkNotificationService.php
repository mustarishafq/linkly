<?php

namespace App\Services;

use App\Support\SqlDate;
use Illuminate\Support\Facades\DB;

class LinkNotificationService
{
    private const VALID_METRICS = ['clicks', 'views', 'unique_clicks', 'conversions', 'conversion_rate'];

    private const VALID_NOTIFY_TYPES = ['target', 'recurring'];

    private const VALID_MODES = ['count', 'percent'];

    public function __construct(
        private EntityService $entities,
        private EventWebhookService $webhooks,
        private InAppNotificationService $inApp,
    ) {}

    public function evaluateForLink(int|string $linkId): void
    {
        $linkId = (int) $linkId;
        $table = $this->entities->tableFor('LinkNotificationRule');
        if (! $table) {
            return;
        }

        $rules = array_values(array_filter(
            $this->entities->fetchAll($table),
            fn (array $row) => (int) ($row['link_id'] ?? 0) === $linkId
        ));

        if ($rules === []) {
            return;
        }

        $link = $this->entities->find($this->entities->tableFor('ShortLink'), $linkId);
        if (! $link) {
            return;
        }

        $metrics = $this->computeMetrics($linkId);

        foreach ($rules as $rule) {
            $metricKey = $this->normalizeMetric((string) ($rule['metric'] ?? 'clicks'));
            $metricValue = $metrics[$metricKey] ?? 0;

            if (! $this->shouldTrigger($rule, $metricValue)) {
                continue;
            }

            $this->dispatchRuleNotification($rule, $link, $metrics, $metricValue, $metricKey);
            $this->markRuleTriggered($table, $rule, $metricValue);
        }
    }

    /** @return array<string, float> */
    private function computeMetrics(int|string $linkId): array
    {
        $linkId = (int) $linkId;
        $clickTable = $this->entities->tableFor('ClickLog');
        $clicks = $clickTable
            ? array_values(array_filter(
                $this->entities->fetchAll($clickTable),
                fn (array $row) => (int) ($row['link_id'] ?? 0) === $linkId
            ))
            : [];

        $clicks = array_values(array_filter($clicks, fn (array $row) => ! (bool) ($row['is_test'] ?? false)));

        $totalClicks = count($clicks);
        $uniqueClicks = count(array_filter($clicks, fn (array $row) => (bool) ($row['is_unique'] ?? false)));
        $conversions = count(array_filter($clicks, fn (array $row) => (bool) ($row['is_converted'] ?? false)));
        $conversionRate = $totalClicks > 0 ? round(($conversions / $totalClicks) * 100, 1) : 0.0;

        return [
            'clicks' => (float) $totalClicks,
            'views' => (float) $uniqueClicks,
            'unique_clicks' => (float) $uniqueClicks,
            'conversions' => (float) $conversions,
            'conversion_rate' => $conversionRate,
        ];
    }

    private function normalizeMetric(string $metric): string
    {
        return $metric === 'views' ? 'unique_clicks' : $metric;
    }

    private function shouldTrigger(array $rule, float $metricValue): bool
    {
        $notifyType = $this->resolveNotifyType($rule);
        $targetValue = (float) ($rule['target_value'] ?? $rule['trigger_value'] ?? 0);

        if ($targetValue <= 0) {
            return false;
        }

        if ($notifyType === 'target') {
            if ((bool) ($rule['is_triggered'] ?? false)) {
                return false;
            }

            return $metricValue >= $targetValue;
        }

        return $this->shouldTriggerRecurring($rule, $metricValue, $targetValue);
    }

    private function shouldTriggerRecurring(array $rule, float $metricValue, float $triggerValue): bool
    {
        $triggerMode = (string) ($rule['trigger_mode'] ?? 'count');
        $lastValue = (float) ($rule['last_triggered_value'] ?? 0);
        $metric = $this->normalizeMetric((string) ($rule['metric'] ?? 'clicks'));

        if ($triggerMode === 'count') {
            $previousMilestone = (int) floor($lastValue / $triggerValue);
            $currentMilestone = (int) floor($metricValue / $triggerValue);

            return $currentMilestone > $previousMilestone && $currentMilestone >= 1;
        }

        if ($metric === 'conversion_rate') {
            $previousThreshold = (int) floor($lastValue / $triggerValue);
            $currentThreshold = (int) floor($metricValue / $triggerValue);

            return $currentThreshold > $previousThreshold && $metricValue >= $triggerValue;
        }

        if ($lastValue <= 0) {
            return $metricValue > 0;
        }

        $growthPercent = (($metricValue - $lastValue) / $lastValue) * 100;

        return $growthPercent >= $triggerValue;
    }

    private function resolveNotifyType(array $rule): string
    {
        $notifyType = (string) ($rule['notify_type'] ?? '');

        if (in_array($notifyType, self::VALID_NOTIFY_TYPES, true)) {
            return $notifyType;
        }

        return 'recurring';
    }

    /** @param  array<string, mixed>  $rule @param  array<string, mixed>  $link @param  array<string, float>  $metrics */
    private function dispatchRuleNotification(
        array $rule,
        array $link,
        array $metrics,
        float $metricValue,
        string $metricKey,
    ): void {
        $subscribers = array_values(array_filter(
            (array) ($rule['subscriber_user_ids'] ?? []),
            fn ($id) => is_string($id) && $id !== ''
        ));

        if ($subscribers === []) {
            return;
        }

        $metricLabel = $this->metricLabel((string) ($rule['metric'] ?? 'clicks'));
        $linkLabel = trim((string) ($link['title'] ?? '')) ?: '/'.($link['slug'] ?? 'link');
        $notifyType = $this->resolveNotifyType($rule);
        $targetValue = (float) ($rule['target_value'] ?? $rule['trigger_value'] ?? 0);
        $formattedTarget = ($rule['metric'] ?? '') === 'conversion_rate'
            ? number_format($targetValue, 1).'%'
            : number_format($targetValue, 0);
        $formattedValue = ($rule['metric'] ?? '') === 'conversion_rate'
            ? number_format($metricValue, 1).'%'
            : number_format($metricValue, 0);

        if ($notifyType === 'target') {
            $title = "{$linkLabel} reached {$formattedTarget} {$metricLabel}";
            $body = "Target hit: {$formattedValue} {$metricLabel} on {$linkLabel}.";
        } else {
            $title = "{$linkLabel} reached {$formattedValue} {$metricLabel}";
            $body = "Recurring alert for {$metricLabel} on {$linkLabel}.";
        }

        $context = [
            'link' => [
                'id' => $link['id'] ?? null,
                'slug' => $link['slug'] ?? null,
                'title' => $link['title'] ?? null,
            ],
            'rule' => [
                'id' => $rule['id'] ?? null,
                'metric' => $rule['metric'] ?? null,
                'notify_type' => $notifyType,
                'target_value' => $targetValue,
                'label' => $rule['label'] ?? null,
            ],
            'metrics' => $metrics,
            'metric_value' => $metricValue,
            'metric_key' => $metricKey,
        ];

        $this->inApp->dispatch('link.metric_threshold', $subscribers, $title, $body, $context);

        $this->webhooks->dispatch(
            'link.metric_threshold',
            $subscribers,
            $title,
            $body,
            $context
        );
    }

    private function markRuleTriggered(string $table, array $rule, float $metricValue): void
    {
        if (! isset($rule['id'])) {
            return;
        }

        $patch = [
            'last_triggered_value' => $metricValue,
            'last_triggered_at' => now()->toIso8601String(),
        ];

        if ($this->resolveNotifyType($rule) === 'target') {
            $patch['is_triggered'] = true;
        }

        $this->entities->update($table, 'LinkNotificationRule', $rule['id'], $patch, null);
    }

    private function metricLabel(string $metric): string
    {
        return match ($metric) {
            'views', 'unique_clicks' => 'views',
            'conversions' => 'conversions',
            'conversion_rate' => 'conversion rate',
            default => 'clicks',
        };
    }
}
