export const LINK_METRIC_OPTIONS = [
  {
    id: "clicks",
    label: "Total clicks",
    description: "Every click on the short link",
    unit: "clicks",
  },
  {
    id: "views",
    label: "Views",
    description: "Unique visitors to the link",
    unit: "views",
  },
  {
    id: "conversions",
    label: "Conversions",
    description: "Tracked conversion events",
    unit: "conversions",
  },
  {
    id: "conversion_rate",
    label: "Conversion rate",
    description: "Percentage of clicks that converted",
    unit: "%",
  },
];

export const NOTIFY_TYPE_OPTIONS = [
  {
    id: "target",
    label: "Target reached",
    description: "Notify once when the metric hits your target",
  },
  {
    id: "recurring",
    label: "Recurring interval",
    description: "Notify repeatedly at count or percent intervals",
  },
];

export const RECURRING_MODE_OPTIONS = [
  {
    id: "count",
    label: "Every count",
    description: "Notify at fixed intervals (e.g. every 100 clicks)",
  },
  {
    id: "percent",
    label: "Every percent",
    description: "Notify at percentage milestones or growth",
  },
];

export function createEmptyNotificationRule(creatorUserId) {
  return {
    clientId: crypto.randomUUID(),
    label: "",
    metric: "clicks",
    notify_type: "target",
    target_value: 1000,
    trigger_mode: "count",
    trigger_value: 100,
    subscriber_user_ids: creatorUserId ? [creatorUserId] : [],
    is_triggered: false,
  };
}

export function getMetricLabel(metricId) {
  return LINK_METRIC_OPTIONS.find((option) => option.id === metricId)?.label || metricId;
}

export function getMetricUnit(metricId) {
  return LINK_METRIC_OPTIONS.find((option) => option.id === metricId)?.unit || "";
}

export function describeNotificationRule(rule) {
  const metric = getMetricLabel(rule.metric).toLowerCase();
  const notifyType = rule.notify_type || "target";
  const targetValue = Number(rule.target_value ?? rule.trigger_value) || 0;
  const unit = getMetricUnit(rule.metric);

  if (notifyType === "target") {
    const formatted = rule.metric === "conversion_rate"
      ? `${targetValue}%`
      : `${targetValue.toLocaleString()} ${unit || metric}`;
    if (rule.is_triggered) {
      return `Target ${formatted} reached`;
    }
    return `Notify once at ${formatted}`;
  }

  const intervalValue = Number(rule.trigger_value) || 0;
  if (rule.trigger_mode === "percent") {
    if (rule.metric === "conversion_rate") {
      return `Every ${intervalValue}% conversion rate milestone`;
    }
    return `Every ${intervalValue}% growth in ${metric}`;
  }

  return `Every ${intervalValue.toLocaleString()} ${metric}`;
}

export function buildNotificationRulePayload(rule, linkId, creatorUserId) {
  const subscribers = Array.from(
    new Set(
      [...(rule.subscriber_user_ids || []), creatorUserId].filter(Boolean)
    )
  );

  const notifyType = rule.notify_type || "target";
  const targetValue = Number(rule.target_value ?? rule.trigger_value);

  return {
    link_id: linkId,
    label: rule.label?.trim() || "",
    metric: rule.metric,
    notify_type: notifyType,
    target_value: notifyType === "target" ? targetValue : null,
    trigger_mode: notifyType === "recurring" ? (rule.trigger_mode || "count") : null,
    trigger_value: notifyType === "recurring" ? Number(rule.trigger_value) : targetValue,
    subscriber_user_ids: subscribers,
    created_by_user_id: creatorUserId,
    is_triggered: Boolean(rule.is_triggered),
    last_triggered_value: rule.last_triggered_value ?? 0,
    last_triggered_at: rule.last_triggered_at ?? null,
  };
}

export function normalizeNotificationRuleFromApi(rule) {
  const notifyType = rule.notify_type
    || (rule.trigger_mode && !rule.target_value ? "recurring" : "target");

  return {
    id: rule.id,
    clientId: rule.id,
    label: rule.label || "",
    metric: rule.metric || "clicks",
    notify_type: notifyType,
    target_value: rule.target_value ?? rule.trigger_value ?? 1000,
    trigger_mode: rule.trigger_mode || "count",
    trigger_value: rule.trigger_value ?? 100,
    subscriber_user_ids: Array.isArray(rule.subscriber_user_ids) ? rule.subscriber_user_ids : [],
    created_by_user_id: rule.created_by_user_id || "",
    is_triggered: Boolean(rule.is_triggered),
    last_triggered_value: rule.last_triggered_value ?? 0,
    last_triggered_at: rule.last_triggered_at ?? null,
  };
}
