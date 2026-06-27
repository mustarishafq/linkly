import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, RefreshCw } from "lucide-react";
import db from "@/api/openClient";
import { useAuth } from "@/lib/AuthContext";
import {
  describeNotificationRule,
  getMetricLabel,
  normalizeNotificationRuleFromApi,
} from "@/lib/linkNotificationConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { glassPanelStyles } from "@/components/layout/glassStyles";

function SubscriberAvatars({ subscriberIds, usersById }) {
  const names = subscriberIds
    .map((id) => usersById.get(id))
    .filter(Boolean)
    .slice(0, 4);

  if (!names.length) {
    return <span className="text-xs text-muted-foreground">No subscribers</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((user) => (
        <span
          key={user.id}
          className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          {user.full_name}
        </span>
      ))}
      {subscriberIds.length > names.length && (
        <span className="text-[11px] text-muted-foreground self-center">
          +{subscriberIds.length - names.length} more
        </span>
      )}
    </div>
  );
}

export default function LinkNotificationManager({ linkId }) {
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const usersById = useMemo(
    () => new Map(users.map((entry) => [entry.id, entry])),
    [users]
  );

  async function loadData() {
    setLoading(true);
    try {
      const [ruleData, userData] = await Promise.all([
        db.entities.LinkNotificationRule.filter({ link_id: linkId }),
        db.users.directory(),
      ]);
      setRules(ruleData.map(normalizeNotificationRuleFromApi));
      setUsers(userData);
    } catch {
      setRules([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [linkId]);

  async function toggleSubscription(rule) {
    if (!user?.id) return;

    setSavingId(rule.id);
    const subscribers = new Set(rule.subscriber_user_ids || []);
    const isSubscribed = subscribers.has(user.id);

    if (isSubscribed) {
      subscribers.delete(user.id);
    } else {
      subscribers.add(user.id);
    }

    try {
      const updated = await db.entities.LinkNotificationRule.update(rule.id, {
        subscriber_user_ids: Array.from(subscribers),
      });
      setRules((current) =>
        current.map((entry) =>
          entry.id === rule.id ? normalizeNotificationRuleFromApi(updated) : entry
        )
      );
      toast({
        title: isSubscribed ? "Unsubscribed" : "Subscribed",
        description: isSubscribed
          ? "You will no longer receive alerts for this rule."
          : "You will receive alerts when this target is reached.",
      });
    } catch (err) {
      toast({
        title: "Could not update subscription",
        description: err?.message || "Please try again.",
      });
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className={cn("rounded-2xl border p-5", glassPanelStyles)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading notification rules…
        </div>
      </div>
    );
  }

  if (!rules.length) {
    return null;
  }

  return (
    <div className={cn("rounded-2xl border p-5 space-y-4", glassPanelStyles)}>
      <div>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Notification alerts</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Milestone alerts for this link. Subscribe to any rule to receive updates when targets are hit.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const isSubscribed = (rule.subscriber_user_ids || []).includes(user?.id);
          const title = rule.label?.trim() || getMetricLabel(rule.metric);

          return (
            <div
              key={rule.id}
              className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{title}</p>
                    {rule.is_triggered && (rule.notify_type || "target") === "target" && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        Target reached
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{describeNotificationRule(rule)}</p>
                  <SubscriberAvatars
                    subscriberIds={rule.subscriber_user_ids || []}
                    usersById={usersById}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSubscribed ? "secondary" : "default"}
                  disabled={savingId === rule.id}
                  onClick={() => toggleSubscription(rule)}
                  className="shrink-0"
                >
                  {savingId === rule.id ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <BellOff className="h-3.5 w-3.5" />
                      Unsubscribe
                    </>
                  ) : (
                    <>
                      <Bell className="h-3.5 w-3.5" />
                      Subscribe
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
