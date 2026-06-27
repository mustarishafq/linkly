import { useMemo } from "react";
import { Bell, ChevronDown, Plus, Trash2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LINK_METRIC_OPTIONS,
  NOTIFY_TYPE_OPTIONS,
  RECURRING_MODE_OPTIONS,
  createEmptyNotificationRule,
  describeNotificationRule,
  getMetricUnit,
} from "@/lib/linkNotificationConfig";

function UserMultiSelect({ users, selectedIds, onChange, currentUserId }) {
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleUser(userId) {
    if (userId === currentUserId) return;
    if (selectedSet.has(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
      return;
    }
    onChange([...selectedIds, userId]);
  }

  if (!users.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No other approved users available yet.
      </p>
    );
  }

  return (
    <div className="max-h-36 overflow-y-auto rounded-lg border border-border divide-y divide-border">
      {users.map((user) => {
        const isSelf = user.id === currentUserId;
        const checked = selectedSet.has(user.id);

        return (
          <label
            key={user.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm",
              isSelf ? "bg-primary/5" : "hover:bg-secondary/50 cursor-pointer"
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={isSelf}
              onChange={() => toggleUser(user.id)}
              className="rounded border-border"
            />
            <span className="min-w-0 flex-1 truncate">
              {user.full_name}
              <span className="text-muted-foreground text-xs ml-1">({user.email})</span>
            </span>
            {isSelf && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                You
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function NotificationRuleEditor({ rule, users, currentUserId, onChange, onRemove, canRemove }) {
  function patch(updates) {
    onChange({ ...rule, ...updates });
  }

  const isTarget = (rule.notify_type || "target") === "target";
  const unit = getMetricUnit(rule.metric);
  const valueLabel = isTarget
    ? rule.metric === "conversion_rate"
      ? "Target rate (%)"
      : `Target ${unit || "count"}`
    : rule.trigger_mode === "percent"
      ? "Percent interval"
      : "Count interval";

  const valueHint = isTarget
    ? "You and subscribers are notified once when this target is reached."
    : rule.trigger_mode === "percent"
      ? rule.metric === "conversion_rate"
        ? "Notify at each rate milestone (10%, 20%, …)"
        : "Notify when the metric grows by this % since the last alert"
      : "Notify at each interval (100, 200, 300, …)";

  return (
    <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Alert rule</p>
          <p className="text-xs text-muted-foreground mt-0.5">{describeNotificationRule(rule)}</p>
        </div>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
        <input
          type="text"
          placeholder="e.g. Launch milestone"
          value={rule.label}
          onChange={(e) => patch({ label: e.target.value })}
          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Target metric</label>
          <select
            value={rule.metric}
            onChange={(e) => patch({ metric: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            {LINK_METRIC_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Notify when</label>
          <select
            value={rule.notify_type || "target"}
            onChange={(e) => patch({ notify_type: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          >
            {NOTIFY_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isTarget ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground">{valueLabel}</label>
          <input
            type="number"
            min="1"
            step={rule.metric === "conversion_rate" ? "0.1" : "1"}
            value={rule.target_value}
            onChange={(e) => patch({ target_value: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{valueHint}</p>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Interval type</label>
            <select
              value={rule.trigger_mode}
              onChange={(e) => patch({ trigger_mode: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              {RECURRING_MODE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">{valueLabel}</label>
            <input
              type="number"
              min="1"
              step={rule.trigger_mode === "percent" ? "0.1" : "1"}
              value={rule.trigger_value}
              onChange={(e) => patch({ trigger_value: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{valueHint}</p>
          </div>
        </>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
          <label className="text-xs font-medium text-muted-foreground">
            Subscribers
          </label>
        </div>
        <UserMultiSelect
          users={users}
          selectedIds={rule.subscriber_user_ids}
          onChange={(subscriber_user_ids) => patch({ subscriber_user_ids })}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

export default function LinkNotificationSection({
  expanded,
  onExpandedChange,
  rules,
  onRulesChange,
  users,
  currentUserId,
}) {
  function addRule() {
    onRulesChange([...rules, createEmptyNotificationRule(currentUserId)]);
  }

  function updateRule(index, nextRule) {
    onRulesChange(rules.map((rule, i) => (i === index ? nextRule : rule)));
  }

  function removeRule(index) {
    onRulesChange(rules.filter((_, i) => i !== index));
  }

  const summary =
    rules.length === 0
      ? "No alerts configured"
      : `${rules.length} alert${rules.length === 1 ? "" : "s"} configured`;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-muted-foreground truncate">{summary}</p>
          </div>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Set click, view, or conversion targets and get notified in-app and via webhook when
            reached. Add teammates as subscribers or let them subscribe from the link detail page.
          </p>

          {rules.map((rule, index) => (
            <NotificationRuleEditor
              key={rule.clientId || rule.id || index}
              rule={rule}
              users={users}
              currentUserId={currentUserId}
              onChange={(nextRule) => updateRule(index, nextRule)}
              onRemove={() => removeRule(index)}
              canRemove={rules.length > 0}
            />
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addRule} className="w-full">
            <Plus className="h-4 w-4 mr-1.5" />
            Add notification rule
          </Button>
        </div>
      )}
    </div>
  );
}
