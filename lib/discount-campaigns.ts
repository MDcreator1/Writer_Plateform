export type OneTimeDiscountStatus = "live" | "upcoming" | "expired" | "invalid";
export type RecurringDiscountType = "weekly" | "monthly";

export type OneTimeDiscountCampaign = {
  id: string;
  title: string;
  description: string;
  percent: number;
  start: string;
  end: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type RecurringDiscountCampaign = {
  id: string;
  title: string;
  description: string;
  percent: number;
  type: RecurringDiscountType;
  dayOfWeek?: number;
  dayOfMonth?: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

type DiscountSettingsLike = {
  scheduledDiscounts?: OneTimeDiscountCampaign[];
  recurringDiscounts?: RecurringDiscountCampaign[];
  scheduledDiscountEnabled?: boolean;
  scheduledDiscountPercent?: number;
  scheduledDiscountStart?: string;
  scheduledDiscountEnd?: string;
  scheduledDiscountTitle?: string;
  scheduledDiscountDescription?: string;
};

export const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
] as const;

function parseDateTime(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function timeToMinutes(value?: string) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isOneTimeDiscountCampaign(value: unknown): value is OneTimeDiscountCampaign {
  if (!value || typeof value !== "object") return false;
  const campaign = value as Partial<OneTimeDiscountCampaign>;
  return Boolean(campaign.id && campaign.start && campaign.end && typeof campaign.percent === "number");
}

function isRecurringDiscountCampaign(value: unknown): value is RecurringDiscountCampaign {
  if (!value || typeof value !== "object") return false;
  const campaign = value as Partial<RecurringDiscountCampaign>;
  return Boolean(
    campaign.id &&
    campaign.type &&
    ["weekly", "monthly"].includes(campaign.type) &&
    campaign.startTime &&
    campaign.endTime &&
    typeof campaign.percent === "number"
  );
}

export function normalizeOneTimeDiscounts(settings: DiscountSettingsLike | null | undefined) {
  if (!settings) return [];
  if (Array.isArray(settings.scheduledDiscounts)) {
    return settings.scheduledDiscounts.filter(isOneTimeDiscountCampaign);
  }

  if (!settings.scheduledDiscountStart && !settings.scheduledDiscountEnd && !settings.scheduledDiscountTitle) {
    return [];
  }

  return [
    {
      id: "legacy-scheduled-discount",
      title: settings.scheduledDiscountTitle || "Scheduled Coin Discount",
      description: settings.scheduledDiscountDescription || "",
      percent: Number(settings.scheduledDiscountPercent) || 0,
      start: settings.scheduledDiscountStart || "",
      end: settings.scheduledDiscountEnd || "",
      enabled: settings.scheduledDiscountEnabled === true,
      createdAt: new Date(0).toISOString()
    }
  ];
}

export function normalizeRecurringDiscounts(settings: DiscountSettingsLike | null | undefined) {
  if (!settings || !Array.isArray(settings.recurringDiscounts)) return [];
  return settings.recurringDiscounts.filter(isRecurringDiscountCampaign);
}

export function getOneTimeDiscountStatus(discount: Pick<OneTimeDiscountCampaign, "start" | "end">, now = new Date()): OneTimeDiscountStatus {
  const start = parseDateTime(discount.start);
  const end = parseDateTime(discount.end);

  if (!start || !end || end <= start) return "invalid";
  if (end < now) return "expired";
  if (now < start) return "upcoming";
  return "live";
}

export function isOneTimeDiscountActive(discount: OneTimeDiscountCampaign, now = new Date()) {
  return discount.enabled && getOneTimeDiscountStatus(discount, now) === "live";
}

export function isRecurringDiscountActive(discount: RecurringDiscountCampaign, now = new Date()) {
  if (!discount.enabled) return false;

  const start = timeToMinutes(discount.startTime);
  const end = timeToMinutes(discount.endTime);
  if (start === null || end === null || end <= start) return false;

  if (discount.type === "weekly") {
    if (discount.dayOfWeek !== now.getDay()) return false;
  } else if (discount.dayOfMonth !== now.getDate()) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();
  return current >= start && current <= end;
}

export function getActiveScheduledDiscount(settings: DiscountSettingsLike | null | undefined, now = new Date()) {
  const oneTime = normalizeOneTimeDiscounts(settings)
    .filter((discount) => isOneTimeDiscountActive(discount, now))
    .map((campaign) => ({ kind: "one-time" as const, campaign }));
  const recurring = normalizeRecurringDiscounts(settings)
    .filter((discount) => isRecurringDiscountActive(discount, now))
    .map((campaign) => ({ kind: "recurring" as const, campaign }));

  return [...oneTime, ...recurring].sort((a, b) => b.campaign.percent - a.campaign.percent)[0] ?? null;
}

export function getNextUpcomingOneTimeDiscount(settings: DiscountSettingsLike | null | undefined, now = new Date()) {
  return normalizeOneTimeDiscounts(settings)
    .filter((discount) => discount.enabled && getOneTimeDiscountStatus(discount, now) === "upcoming")
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0] ?? null;
}

export function describeRecurringDiscount(discount: RecurringDiscountCampaign) {
  const day = discount.type === "weekly"
    ? WEEKDAY_OPTIONS.find((option) => option.value === discount.dayOfWeek)?.label ?? "selected weekday"
    : `day ${discount.dayOfMonth ?? 1}`;

  return discount.type === "weekly"
    ? `Every ${day}, ${discount.startTime} to ${discount.endTime}`
    : `Every month on ${day}, ${discount.startTime} to ${discount.endTime}`;
}
