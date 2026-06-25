"use client";

import { useState, useEffect, Fragment } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Coins,
  CreditCard,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  Crown,
  BookOpen,
  MessageSquare,
  Calendar,
  ShieldAlert,
  ListChecks,
  Layout,
  Activity,
  History,
  Bookmark,
  Mail,
  Smartphone,
  AlertOctagon,
  RefreshCw,
  Trash,
  FileText,
  Link2,
  Tag,
  Clock,
  Heart
} from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { PublishedStoriesSection } from "@/components/published-stories-section";
import { UnpublishedStoriesSection } from "@/components/unpublished-stories-section";
import { CustomSelect } from "@/components/custom-select";
import { useToast } from "@/components/toast-context";
import {
  describeRecurringDiscount,
  getActiveScheduledDiscount,
  getNextUpcomingOneTimeDiscount,
  getOneTimeDiscountStatus,
  normalizeOneTimeDiscounts,
  normalizeRecurringDiscounts,
  WEEKDAY_OPTIONS,
  type OneTimeDiscountCampaign,
  type OneTimeDiscountStatus,
  type RecurringDiscountCampaign,
  type RecurringDiscountType
} from "@/lib/discount-campaigns";
import type { Story } from "@/lib/content";
import type { CoinPackage } from "@prisma/client";

type AdminPageProps = {
  searchQuery: string;
  data: {
    analytics: {
      totalUsers: number;
      activeUsers: number;
      verifiedUsers: number;
      verifiedPhoneUsers: number;
      totalStories: number;
      totalChapters: number;
      totalRevenue: number;
      totalCoinSales: number;
      subscriptionRevenue: number;
      monthlyRevenue: number;
      pendingRefunds: number;
      failedPayments: number;
      newRegistrations: number;
      conversionRate: number;
    };
    chartData: {
      timeline: Array<{
        date: string;
        revenue: number;
        coins: number;
        chapterSales: number;
        users: number;
      }>;
      storyPopularity: Array<{
        id: string;
        title: string;
        reads: number;
        bookmarks: number;
        comments: number;
      }>;
      mostViewedChapters: Array<{
        id: string;
        title: string;
        storyTitle: string;
        views: number;
        unlocks: number;
      }>;
    };
    payments: Array<{
      id: string;
      user: string | null;
      email: string;
      orderId: string;
      paymentId: string;
      packageName: string;
      amountPaid: number;
      coinsReceived: number;
      method: string;
      status: string;
      date: string;
    }>;
    stories: Story[];
    coinPackages: CoinPackage[];
    studioProjects: Array<{
      id: string;
      projectId: string;
      projectTitle: string;
      source: string;
      storyId: string;
      storyTitle: string;
      published: boolean;
      cloudFileCount: number;
      cloudUpdatedAt: string | null;
    }>;
    subscriptionStats: {
      totalActive: number;
      totalExpired: number;
      weeklyActive: number;
      monthlyActive: number;
      yearlyActive: number;
      totalRevenue: number;
    };
  };
};

const DEFAULT_WRITING_STUDIO_URL = "http://localhost:5500/story-novel-project-editor.html";
const DEFAULT_SCHEDULE_DURATION_MINUTES = 24 * 60;
const SCHEDULE_NOW_TOLERANCE_MS = 60 * 1000;
const DISCOUNT_PERIOD_PRESETS = [
  { label: "Now + 24h", startOffsetMinutes: 0, durationMinutes: 24 * 60 },
  { label: "+1h + 24h", startOffsetMinutes: 60, durationMinutes: 24 * 60 },
  { label: "Tomorrow + 3d", startOffsetMinutes: 24 * 60, durationMinutes: 3 * 24 * 60 },
  { label: "Next 7d", startOffsetMinutes: 0, durationMinutes: 7 * 24 * 60 }
] as const;
const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function toDateTimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocalValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMinutesToDateTimeLocalValue(value: string, minutes: number) {
  const parsed = parseDateTimeLocalValue(value) ?? new Date();
  return toDateTimeLocalValue(new Date(parsed.getTime() + minutes * 60 * 1000));
}

function isDateTimeLocalBefore(value: string, minimum: string) {
  const parsedValue = parseDateTimeLocalValue(value);
  const parsedMinimum = parseDateTimeLocalValue(minimum);
  return Boolean(parsedValue && parsedMinimum && parsedValue < parsedMinimum);
}

function buildStudioUrl(
  studioBaseUrl: string,
  platformUrl: string,
  input: { storyId?: string; storyTitle?: string; projectId?: string }
) {
  try {
    const url = new URL(studioBaseUrl || DEFAULT_WRITING_STUDIO_URL);
    url.searchParams.set("platformAction", input.storyId ? "manage-chapters" : "open-studio");
    url.searchParams.set("platformUrl", platformUrl || "http://localhost:3000");
    if (input.storyId) url.searchParams.set("platformStoryId", input.storyId);
    if (input.storyTitle) url.searchParams.set("platformStoryTitle", input.storyTitle);
    if (input.projectId) url.searchParams.set("platformProjectId", input.projectId);
    return url.toString();
  } catch {
    return studioBaseUrl || DEFAULT_WRITING_STUDIO_URL;
  }
}

export function AdminPage({ data }: AdminPageProps) {
  const { showToast, confirm } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "stories" | "payments" | "moderation" | "security" | "audit" | "monetization" | "layouts">("overview");

  // --- Users management states ---
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [, setLoadingDetails] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"wallet" | "purchases" | "reading" | "bookmarks">("wallet");

  // --- Payments management states ---
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [verifyingPaymentId, setVerifyingPaymentId] = useState("");
  const [refundingPaymentId, setRefundingPaymentId] = useState("");

  // --- Global Wallet Adjustment form states ---
  const [, setWalletAdjustUser] = useState("");
  const [walletAdjustAction, setWalletAdjustAction] = useState("credit");
  const [walletAdjustAmount, setWalletAdjustAmount] = useState("");
  const [walletAdjustDesc, setWalletAdjustDesc] = useState("");
  const [adjustingWallet, setAdjustingWallet] = useState(false);
  const [adjustingUserWallet, setAdjustingUserWallet] = useState<{ id: string; email: string; user: string } | null>(null);

  // --- Inline user wallet adjustment inside modal ---
  const [inlineAdjustOpen, setInlineAdjustOpen] = useState(false);
  const [inlineAdjustAction, setInlineAdjustAction] = useState("credit");
  const [inlineAdjustAmount, setInlineAdjustAmount] = useState("");
  const [inlineAdjustDesc, setInlineAdjustDesc] = useState("");

  // --- Moderation & Queues States (Phase 6) ---
  const [modSubTab, setModSubTab] = useState<"comments" | "emails" | "phone" | "feedback">("comments");

  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentSearch, setCommentSearch] = useState("");
  const [commentFilter, setCommentFilter] = useState(""); // "", "reported", "hidden"

  const [emails, setEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");
  const [emailStatusFilter, setEmailStatusFilter] = useState("");

  const [phoneVerifications, setPhoneVerifications] = useState<any[]>([]);
  const [loadingPhone, setLoadingPhone] = useState(false);

  // --- Feedback & Writer's Note states ---
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [writerNote, setWriterNote] = useState("");
  const [writerTwitter, setWriterTwitter] = useState("");
  const [writerInstagram, setWriterInstagram] = useState("");
  const [writerFacebook, setWriterFacebook] = useState("");
  const [writerYoutube, setWriterYoutube] = useState("");
  const [writerLinkedin, setWriterLinkedin] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // --- Security & Audits States (Phase 7) ---
  const [securityActivities, setSecurityActivities] = useState<any[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [securitySearch, setSecuritySearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [expandedSecurityId, setExpandedSecurityId] = useState<string | null>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // --- Clickable KPI detail metric state ---
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // --- Layouts Management States ---
  const [homeLayout, setHomeLayout] = useState("classic");
  const [readerLayout, setReaderLayout] = useState("classic");
  const [loadingLayouts, setLoadingLayouts] = useState(false);
  const [availableLayouts, setAvailableLayouts] = useState<any[]>([]);
  const [availableReaderLayouts, setAvailableReaderLayouts] = useState<any[]>([]);


  // --- Monetization management states ---
  const [localPackages, setLocalPackages] = useState<CoinPackage[]>(data.coinPackages);
  const [packageName, setPackageName] = useState("");
  const [packageCoins, setPackageCoins] = useState(0);
  const [packageBonus, setPackageBonus] = useState(0);
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageCampaign, setPackageCampaign] = useState("");
  const [packageActive, setPackageActive] = useState(true);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);

  const [activeDiscountCampaign, setActiveCampaignName] = useState("Summer Coin Sale");
  const [loadingMonetization, setLoadingMonetization] = useState(false);

  // --- New Monetization Sub-tabs, Scheduled Discount, and Subscription States ---
  const [monetizationSubTab, setMonetizationSubTab] = useState<"coins" | "subscriptions">("coins");

  // Scheduled Discount states
  const [scheduledDiscountEnabled, setScheduledDiscountEnabled] = useState(false);
  const [scheduledDiscountPercent, setScheduledDiscountPercent] = useState(10);
  const [scheduledDiscountStart, setScheduledDiscountStart] = useState("");
  const [scheduledDiscountEnd, setScheduledDiscountEnd] = useState("");
  const [scheduledDiscountTitle, setScheduledDiscountTitle] = useState("");
  const [scheduledDiscountDescription, setScheduledDiscountDescription] = useState("");
  const [savingScheduledDiscount, setSavingScheduledDiscount] = useState(false);
  const [currentDateTimeInput, setCurrentDateTimeInput] = useState("");
  const [scheduledDiscounts, setScheduledDiscounts] = useState<OneTimeDiscountCampaign[]>([]);
  const [recurringDiscounts, setRecurringDiscounts] = useState<RecurringDiscountCampaign[]>([]);
  const [editingScheduledDiscountId, setEditingScheduledDiscountId] = useState<string | null>(null);
  const [scheduleDiscountMode, setScheduleDiscountMode] = useState<"one-time" | "specific-day">("one-time");
  const [recurringDiscountTitle, setRecurringDiscountTitle] = useState("");
  const [recurringDiscountDescription, setRecurringDiscountDescription] = useState("");
  const [recurringDiscountPercent, setRecurringDiscountPercent] = useState(10);
  const [recurringDiscountType, setRecurringDiscountType] = useState<RecurringDiscountType>("weekly");
  const [recurringDiscountDayOfWeek, setRecurringDiscountDayOfWeek] = useState(5);
  const [recurringDiscountDayOfMonth, setRecurringDiscountDayOfMonth] = useState(1);
  const [recurringDiscountStartTime, setRecurringDiscountStartTime] = useState("10:00");
  const [recurringDiscountEndTime, setRecurringDiscountEndTime] = useState("23:59");
  const [recurringDiscountEnabled, setRecurringDiscountEnabled] = useState(true);

  // Package Form Discount states
  const [packageManualDiscount, setPackageManualDiscount] = useState(0);
  const [packageCombinedDiscount, setPackageCombinedDiscount] = useState(0);

  // Subscription Configuration states
  const [subCoinsPerDay, setSubCoinsPerDay] = useState(10);
  const [weeklyBasePrice, setWeeklyBasePrice] = useState(150);
  const [monthlyBasePrice, setMonthlyBasePrice] = useState(450);
  const [yearlyBasePrice, setYearlyBasePrice] = useState(3600);
  const [monthlyUpgradeDiscount, setMonthlyUpgradeDiscount] = useState(10);
  const [yearlyUpgradeDiscount, setYearlyUpgradeDiscount] = useState(25);
  const [subscriptionsEnabled, setSubscriptionsEnabled] = useState(true);
  const [savingSubSettings, setSavingSubSettings] = useState(false);

  const discountSettingsSnapshot = {
    scheduledDiscounts,
    recurringDiscounts,
    scheduledDiscountEnabled,
    scheduledDiscountPercent,
    scheduledDiscountStart,
    scheduledDiscountEnd,
    scheduledDiscountTitle,
    scheduledDiscountDescription
  };
  const activeScheduledDiscount = getActiveScheduledDiscount(discountSettingsSnapshot);
  const activeScheduledDiscountPercent = activeScheduledDiscount?.campaign.percent ?? 0;

  const isScheduledDiscountActive = () => Boolean(activeScheduledDiscount);

  const getScheduleMinDateTime = () => currentDateTimeInput || toDateTimeLocalValue(new Date());

  const validateScheduledDiscountSettings = (enabled = scheduledDiscountEnabled) => {
    if (!enabled) return "";
    if (!scheduledDiscountStart || !scheduledDiscountEnd) {
      return "Please select both start and end date/time for the discount campaign.";
    }

    const now = new Date();
    const start = parseDateTimeLocalValue(scheduledDiscountStart);
    const end = parseDateTimeLocalValue(scheduledDiscountEnd);

    if (!start || !end) {
      return "Please choose a valid start and end date/time.";
    }

    if (start.getTime() < now.getTime() - SCHEDULE_NOW_TOLERANCE_MS) {
      return "Start time cannot be in the past. Use Start Now or choose a future time.";
    }

    if (end <= start) {
      return "End time must be after the start time.";
    }

    if (end <= now) {
      return "End time must be in the future.";
    }

    if (scheduledDiscountPercent < 0 || scheduledDiscountPercent > 90) {
      return "Discount percentage must stay between 0 and 90.";
    }

    return "";
  };

  const validateRecurringDiscountSettings = () => {
    if (!recurringDiscountTitle.trim()) return "Please add a title for the recurring discount.";
    if (recurringDiscountPercent < 0 || recurringDiscountPercent > 90) return "Recurring discount percentage must stay between 0 and 90.";
    if (!recurringDiscountStartTime || !recurringDiscountEndTime) return "Please select start and end time for the recurring discount.";

    const start = recurringDiscountStartTime.split(":").map(Number);
    const end = recurringDiscountEndTime.split(":").map(Number);
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
      return "Recurring discount end time must be after start time.";
    }

    return "";
  };

  const scheduleMinDateTime = getScheduleMinDateTime();
  const scheduleEndMinDateTime = scheduledDiscountStart
    ? addMinutesToDateTimeLocalValue(scheduledDiscountStart, 1)
    : scheduleMinDateTime;
  const scheduledDiscountValidationMessage = validateScheduledDiscountSettings();

  const oneTimeDiscountPanels = scheduledDiscounts
    .map((discount) => ({ discount, status: getOneTimeDiscountStatus(discount) }))
    .sort((a, b) => {
      const priority: Record<string, number> = { live: 0, upcoming: 1, expired: 2, invalid: 3 };
      const priorityDiff = priority[a.status] - priority[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(a.discount.start).getTime() - new Date(b.discount.start).getTime();
    })
    .slice(0, 3);

  const getOneTimeStatusMeta = (status: OneTimeDiscountStatus, enabled: boolean) => {
    if (!enabled && status !== "expired") {
      return { label: "Disabled", colorClass: "bg-muted/10 text-muted border-border/60" };
    }

    if (status === "live") return { label: "Live", colorClass: "bg-success/15 text-success border-success/30" };
    if (status === "upcoming") return { label: "Upcoming", colorClass: "bg-accent/15 text-accent border-accent/30" };
    if (status === "expired") return { label: "Expired", colorClass: "bg-muted/10 text-muted border-border/60" };
    return { label: "Invalid", colorClass: "bg-danger/10 text-danger border-danger/20" };
  };

  const getLegacyScheduledDiscountFields = (discounts: OneTimeDiscountCampaign[]) => {
    const primary = discounts.find((discount) => discount.enabled && getOneTimeDiscountStatus(discount) === "live")
      ?? getNextUpcomingOneTimeDiscount({ scheduledDiscounts: discounts, recurringDiscounts })
      ?? discounts[0]
      ?? null;

    return {
      scheduledDiscountEnabled: primary?.enabled ?? false,
      scheduledDiscountPercent: primary?.percent ?? scheduledDiscountPercent,
      scheduledDiscountStart: primary?.start ?? scheduledDiscountStart,
      scheduledDiscountEnd: primary?.end ?? scheduledDiscountEnd,
      scheduledDiscountTitle: primary?.title ?? scheduledDiscountTitle.trim(),
      scheduledDiscountDescription: primary?.description ?? scheduledDiscountDescription.trim()
    };
  };

  const persistDiscountCampaigns = async (
    nextOneTimeDiscounts: OneTimeDiscountCampaign[],
    nextRecurringDiscounts: RecurringDiscountCampaign[]
  ) => {
    const legacyFields = getLegacyScheduledDiscountFields(nextOneTimeDiscounts);
    const res = await fetch("/api/admin/packages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...legacyFields,
        scheduledDiscounts: nextOneTimeDiscounts,
        recurringDiscounts: nextRecurringDiscounts
      })
    });
    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.error?.message || "Failed to save scheduled discount");
    }

    setScheduledDiscounts(nextOneTimeDiscounts);
    setRecurringDiscounts(nextRecurringDiscounts);
    return body;
  };

  const handleScheduledDiscountStartChange = (value: string) => {
    const safeValue = value && isDateTimeLocalBefore(value, getScheduleMinDateTime())
      ? getScheduleMinDateTime()
      : value;
    setScheduledDiscountStart(safeValue);

    const minimumEnd = safeValue
      ? addMinutesToDateTimeLocalValue(safeValue, 1)
      : getScheduleMinDateTime();
    if (safeValue && (!scheduledDiscountEnd || isDateTimeLocalBefore(scheduledDiscountEnd, minimumEnd))) {
      setScheduledDiscountEnd(addMinutesToDateTimeLocalValue(safeValue, DEFAULT_SCHEDULE_DURATION_MINUTES));
    }
  };

  const handleScheduledDiscountEndChange = (value: string) => {
    const minimumEnd = scheduledDiscountStart
      ? addMinutesToDateTimeLocalValue(scheduledDiscountStart, 1)
      : getScheduleMinDateTime();
    setScheduledDiscountEnd(value && isDateTimeLocalBefore(value, minimumEnd) ? minimumEnd : value);
  };

  const handleApplySchedulePreset = (startOffsetMinutes: number, durationMinutes: number) => {
    const start = toDateTimeLocalValue(new Date(Date.now() + startOffsetMinutes * 60 * 1000));
    setScheduledDiscountStart(start);
    setScheduledDiscountEnd(addMinutesToDateTimeLocalValue(start, durationMinutes));
  };

  const resetScheduledDiscountForm = () => {
    setEditingScheduledDiscountId(null);
    setScheduledDiscountEnabled(true);
    setScheduledDiscountPercent(10);
    setScheduledDiscountStart("");
    setScheduledDiscountEnd("");
    setScheduledDiscountTitle("");
    setScheduledDiscountDescription("");
  };

  const handleEditScheduledDiscount = (discount: OneTimeDiscountCampaign) => {
    const status = getOneTimeDiscountStatus(discount);
    if (status !== "upcoming") {
      showToast("Only upcoming discounts can be edited from this panel.", "warning");
      return;
    }

    setEditingScheduledDiscountId(discount.id);
    setScheduleDiscountMode("one-time");
    setScheduledDiscountEnabled(discount.enabled);
    setScheduledDiscountPercent(discount.percent);
    setScheduledDiscountStart(discount.start);
    setScheduledDiscountEnd(discount.end);
    setScheduledDiscountTitle(discount.title);
    setScheduledDiscountDescription(discount.description);
  };

  // Fetch layouts
  const fetchLayouts = async () => {
    setLoadingLayouts(true);
    try {
      const res = await fetch("/api/admin/layouts");
      if (res.ok) {
        const body = await res.json();
        const layoutsList = body.data?.layouts || [];
        const home = layoutsList.find((l: any) => l.pageName === "home");
        if (home) {
          setHomeLayout(home.layoutName);
        }
        const reader = layoutsList.find((l: any) => l.pageName === "reader");
        if (reader) {
          setReaderLayout(reader.layoutName);
        }
        setAvailableLayouts(body.data?.availableLayouts || []);
        setAvailableReaderLayouts(body.data?.availableReaderLayouts || []);
      }
    } catch (err) {
      showToast("Error loading page layouts", "error");
    } finally {
      setLoadingLayouts(false);
    }
  };

  const handleUpdateLayout = async (pageName: string, layoutName: string) => {
    try {
      const res = await fetch("/api/admin/layouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageName, layoutName })
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Page layout updated successfully!", "success");
        if (pageName === "home") {
          setHomeLayout(layoutName);
        } else if (pageName === "reader") {
          setReaderLayout(layoutName);
        }
      } else {
        showToast(body.error?.message || "Failed to update layout", "error");
      }
    } catch (err) {
      showToast("Error updating layout", "error");
    }
  };

  // Fetch users list
  const fetchUsers = async (ignoreFilters = false) => {
    setLoadingUsers(true);
    try {
      const queryParams = new URLSearchParams();
      if (!ignoreFilters) {
        if (userSearch) queryParams.set("q", userSearch);
        if (roleFilter) queryParams.set("role", roleFilter);
        if (statusFilter) queryParams.set("status", statusFilter);
      }

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setUsers(body.data || []);
      } else {
        showToast(body.error?.message || "Failed to load users", "error");
      }
    } catch (err) {
      showToast("Error loading users", "error");
    } finally {
      setLoadingUsers(false);
    }
  };

  // View user details
  const viewUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const body = await res.json();
      if (res.ok) {
        setSelectedUser(body.data);
      } else {
        showToast(body.error?.message || "Failed to load user details", "error");
      }
    } catch (err) {
      showToast("Error loading user details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Execute admin moderator action
  const executeUserAction = async (userId: string, action: string, e: React.MouseEvent) => {
    const confirmationMsg =
      action === "suspend" ? "Are you sure you want to suspend this account?" :
        action === "unsuspend" ? "Are you sure you want to unsuspend this account?" :
          action === "ban" ? "Are you sure you want to block/ban this user?" :
            action === "force-logout" ? "Are you sure you want to revoke all active sessions for this user?" :
              "Are you sure you want to reset email & phone verification status?";

    const ok = await confirm(confirmationMsg, e.clientX, e.clientY);
    if (!ok) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Action completed successfully", "success");
        await fetchUsers();
        if (selectedUser?.user?.id === userId) {
          await viewUserDetails(userId);
        }
      } else {
        showToast(body.error?.message || "Failed to execute action", "error");
      }
    } catch (err) {
      showToast("Error executing action", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const fetchMonetizationData = async () => {
    setLoadingMonetization(true);
    try {
      const res = await fetch("/api/admin/packages");
      const body = await res.json();
      if (res.ok) {
        setLocalPackages(body.data?.packages || []);
        const s = body.data?.settings || {};
        setActiveCampaignName(s.activeCampaign ?? "Summer Coin Sale");

        // Scheduled discounts settings
        const oneTimeDiscounts = normalizeOneTimeDiscounts(s);
        const recurringCampaigns = normalizeRecurringDiscounts(s);
        const firstEditableDiscount = oneTimeDiscounts.find((discount) => getOneTimeDiscountStatus(discount) === "upcoming") ?? oneTimeDiscounts[0];
        setScheduledDiscounts(oneTimeDiscounts);
        setRecurringDiscounts(recurringCampaigns);
        setScheduledDiscountEnabled(firstEditableDiscount?.enabled ?? s.scheduledDiscountEnabled ?? false);
        setScheduledDiscountPercent(firstEditableDiscount?.percent ?? s.scheduledDiscountPercent ?? 10);
        setScheduledDiscountStart(firstEditableDiscount?.start ?? s.scheduledDiscountStart ?? "");
        setScheduledDiscountEnd(firstEditableDiscount?.end ?? s.scheduledDiscountEnd ?? "");
        setScheduledDiscountTitle(firstEditableDiscount?.title ?? s.scheduledDiscountTitle ?? "");
        setScheduledDiscountDescription(firstEditableDiscount?.description ?? s.scheduledDiscountDescription ?? "");
        setEditingScheduledDiscountId(null);

        // Subscription configurations settings
        setSubCoinsPerDay(s.subCoinsPerDay ?? 10);
        setWeeklyBasePrice(s.weeklyBasePrice ?? 150);
        setMonthlyBasePrice(s.monthlyBasePrice ?? 450);
        setYearlyBasePrice(s.yearlyBasePrice ?? 3600);
        setMonthlyUpgradeDiscount(s.monthlyUpgradeDiscount ?? 10);
        setYearlyUpgradeDiscount(s.yearlyUpgradeDiscount ?? 25);
        setSubscriptionsEnabled(s.subscriptionsEnabled ?? true);
      } else {
        showToast(body.error?.message || "Failed to load monetization data", "error");
      }
    } catch (err) {
      showToast("Error loading monetization settings", "error");
    } finally {
      setLoadingMonetization(false);
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName || packageCoins <= 0 || packagePrice < 0) {
      showToast("Please fill in name, coins count and price correctly.", "error");
      return;
    }

    setSavingPackage(true);
    try {
      const isEditing = !!editingPackageId;
      const url = isEditing
        ? `/api/admin/packages/${editingPackageId}`
        : "/api/admin/packages";
      const method = isEditing ? "PATCH" : "POST";

      const campaignTag = `${packageCampaign || "None"}|${packageManualDiscount || 0}|${packageCombinedDiscount || 0}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: packageName,
          coins: Number(packageCoins),
          bonusCoins: Number(packageBonus),
          priceCents: Math.round(Number(packagePrice) * 100), // INR to Cents
          campaign: campaignTag,
          active: packageActive
        })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(isEditing ? "Package updated successfully!" : "Package created successfully!", "success");
        setPackageName("");
        setPackageCoins(0);
        setPackageBonus(0);
        setPackagePrice(0);
        setPackageCampaign("");
        setPackageManualDiscount(0);
        setPackageCombinedDiscount(0);
        setPackageActive(true);
        setEditingPackageId(null);
        setIsPackageModalOpen(false);
        await fetchMonetizationData();
      } else {
        showToast(body.error?.message || "Failed to save package", "error");
      }
    } catch (err) {
      showToast("Error saving package", "error");
    } finally {
      setSavingPackage(false);
    }
  };

  const handleEditPackage = (pack: any) => {
    setEditingPackageId(pack.id);
    setPackageName(pack.name);
    setPackageCoins(pack.coins);
    setPackageBonus(pack.bonus || pack.bonusCoins || 0);
    setPackagePrice(pack.price || (pack.priceCents / 100));
    setPackageActive(pack.active !== false);

    const parts = (pack.campaign || "").split("|");
    setPackageCampaign(parts[0] || "");
    setPackageManualDiscount(Number(parts[1]) || 0);
    setPackageCombinedDiscount(Number(parts[2]) || 0);
    setIsPackageModalOpen(true);
  };

  const handleDeletePackage = async (packageId: string, e: React.MouseEvent) => {
    const ok = await confirm("Are you sure you want to delete this coin package? This cannot be undone.", e.clientX, e.clientY);
    if (!ok) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/packages/${packageId}`, { method: "DELETE" });
      const body = await res.json();
      if (res.ok) {
        showToast("Package deleted successfully!", "success");
        await fetchMonetizationData();
      } else {
        showToast(body.error?.message || "Failed to delete package", "error");
      }
    } catch (err) {
      showToast("Error deleting package", "error");
    }
  };



  const handleSaveScheduledDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationMessage = validateScheduledDiscountSettings();
    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    const existingDiscount = scheduledDiscounts.find((discount) => discount.id === editingScheduledDiscountId);
    const nowIso = new Date().toISOString();
    const nextDiscount: OneTimeDiscountCampaign = {
      id: editingScheduledDiscountId ?? `discount-${Date.now()}`,
      title: scheduledDiscountTitle.trim() || "Scheduled Coin Discount",
      description: scheduledDiscountDescription.trim(),
      percent: Number(scheduledDiscountPercent),
      start: scheduledDiscountStart,
      end: scheduledDiscountEnd,
      enabled: scheduledDiscountEnabled,
      createdAt: existingDiscount?.createdAt ?? nowIso,
      updatedAt: nowIso
    };
    const nextDiscounts = editingScheduledDiscountId
      ? scheduledDiscounts.map((discount) => discount.id === editingScheduledDiscountId ? nextDiscount : discount)
      : [nextDiscount, ...scheduledDiscounts];

    setSavingScheduledDiscount(true);
    try {
      await persistDiscountCampaigns(nextDiscounts, recurringDiscounts);
      showToast(editingScheduledDiscountId ? "Scheduled discount updated successfully!" : "Scheduled discount added successfully!", "success");
      resetScheduledDiscountForm();
      await fetchMonetizationData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving scheduled discount", "error");
    } finally {
      setSavingScheduledDiscount(false);
    }
  };

  const handleToggleOneTimeDiscount = async (discountId: string, enabled: boolean) => {
    const targetDiscount = scheduledDiscounts.find((discount) => discount.id === discountId);
    if (!targetDiscount) return;

    if (enabled && getOneTimeDiscountStatus(targetDiscount) === "expired") {
      showToast("Expired discounts cannot be enabled again.", "warning");
      return;
    }

    const nextDiscounts = scheduledDiscounts.map((discount) => (
      discount.id === discountId
        ? { ...discount, enabled, updatedAt: new Date().toISOString() }
        : discount
    ));

    setSavingScheduledDiscount(true);
    try {
      await persistDiscountCampaigns(nextDiscounts, recurringDiscounts);
      await fetchMonetizationData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error updating discount state", "error");
    } finally {
      setSavingScheduledDiscount(false);
    }
  };

  const handleSaveRecurringDiscount = async () => {
    const validationMessage = validateRecurringDiscountSettings();
    if (validationMessage) {
      showToast(validationMessage, "error");
      return;
    }

    const nowIso = new Date().toISOString();
    const nextRecurringDiscount: RecurringDiscountCampaign = {
      id: `recurring-discount-${Date.now()}`,
      title: recurringDiscountTitle.trim(),
      description: recurringDiscountDescription.trim(),
      percent: Number(recurringDiscountPercent),
      type: recurringDiscountType,
      dayOfWeek: recurringDiscountType === "weekly" ? Number(recurringDiscountDayOfWeek) : undefined,
      dayOfMonth: recurringDiscountType === "monthly" ? Number(recurringDiscountDayOfMonth) : undefined,
      startTime: recurringDiscountStartTime,
      endTime: recurringDiscountEndTime,
      enabled: recurringDiscountEnabled,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setSavingScheduledDiscount(true);
    try {
      await persistDiscountCampaigns(scheduledDiscounts, [nextRecurringDiscount, ...recurringDiscounts]);
      showToast("Recurring discount added successfully!", "success");
      setRecurringDiscountTitle("");
      setRecurringDiscountDescription("");
      setRecurringDiscountPercent(10);
      setRecurringDiscountType("weekly");
      setRecurringDiscountDayOfWeek(5);
      setRecurringDiscountDayOfMonth(1);
      setRecurringDiscountStartTime("10:00");
      setRecurringDiscountEndTime("23:59");
      setRecurringDiscountEnabled(true);
      await fetchMonetizationData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving recurring discount", "error");
    } finally {
      setSavingScheduledDiscount(false);
    }
  };

  const handleToggleRecurringDiscount = async (discountId: string, enabled: boolean) => {
    const nextRecurringDiscounts = recurringDiscounts.map((discount) => (
      discount.id === discountId
        ? { ...discount, enabled, updatedAt: new Date().toISOString() }
        : discount
    ));

    setSavingScheduledDiscount(true);
    try {
      await persistDiscountCampaigns(scheduledDiscounts, nextRecurringDiscounts);
      await fetchMonetizationData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error updating recurring discount state", "error");
    } finally {
      setSavingScheduledDiscount(false);
    }
  };
  const handleSaveSubSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSubSettings(true);
    try {
      const res = await fetch("/api/admin/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subCoinsPerDay: Number(subCoinsPerDay),
          weeklyBasePrice: Number(weeklyBasePrice),
          monthlyBasePrice: Number(monthlyBasePrice),
          yearlyBasePrice: Number(yearlyBasePrice),
          monthlyUpgradeDiscount: Number(monthlyUpgradeDiscount),
          yearlyUpgradeDiscount: Number(yearlyUpgradeDiscount),
          subscriptionsEnabled
        })
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Subscription configuration updated successfully!", "success");
        await fetchMonetizationData();
      } else {
        showToast(body.error?.message || "Failed to update subscription settings", "error");
      }
    } catch (err) {
      showToast("Error saving subscription settings", "error");
    } finally {
      setSavingSubSettings(false);
    }
  };

  // Fetch payments list
  const fetchPayments = async (ignoreFilters = false) => {
    setLoadingPayments(true);
    try {
      const queryParams = new URLSearchParams();
      if (!ignoreFilters) {
        if (paymentSearch) queryParams.set("q", paymentSearch);
        if (paymentStatusFilter) queryParams.set("status", paymentStatusFilter);
      }

      const res = await fetch(`/api/admin/payments?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setPayments(body.data || []);
      } else {
        showToast(body.error?.message || "Failed to load payments ledger", "error");
      }
    } catch (err) {
      showToast("Error loading payments", "error");
    } finally {
      setLoadingPayments(false);
    }
  };

  // Run payment verification check-sum retry
  const handleVerifyPayment = async (paymentId: string) => {
    setVerifyingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: "POST"
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Payment verified and coins credited successfully!", "success");
        await fetchPayments();
      } else {
        showToast(body.error?.message || "Verification check failed.", "error");
      }
    } catch (err) {
      showToast("Error retrying verification", "error");
    } finally {
      setVerifyingPaymentId("");
    }
  };

  // Run payment refund processing
  const handleRefundPayment = async (paymentId: string, action: "approve" | "reject", e: React.MouseEvent) => {
    const confirmationMsg = action === "approve"
      ? "Are you sure you want to approve this refund? This will mark the payment as REFUNDED and deduct the credited coins from the user's wallet."
      : "Are you sure you want to reject this refund request?";

    const ok = await confirm(confirmationMsg, e.clientX, e.clientY);
    if (!ok) {
      return;
    }
    setRefundingPaymentId(paymentId);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || `Refund request processed.`, "success");
        await fetchPayments();
      } else {
        showToast(body.error?.message || "Refund processing failed.", "error");
      }
    } catch (err) {
      showToast("Error processing refund", "error");
    } finally {
      setRefundingPaymentId("");
    }
  };

  // Run wallet balance adjustments
  const handleAdjustWallet = async (userId: string, inline = false) => {
    const action = inline ? inlineAdjustAction : walletAdjustAction;
    const amountStr = inline ? inlineAdjustAmount : walletAdjustAmount;
    const desc = inline ? inlineAdjustDesc : walletAdjustDesc;

    if (!amountStr || isNaN(Number(amountStr)) || Number(amountStr) < 0) {
      showToast("Please enter a valid positive amount.", "error");
      return;
    }

    setAdjustingWallet(true);
    try {
      const res = await fetch(`/api/admin/wallets/${userId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, amount: Number(amountStr), description: desc })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Wallet balance updated successfully.", "success");

        // Reset states
        if (inline) {
          setInlineAdjustAmount("");
          setInlineAdjustDesc("");
          setInlineAdjustOpen(false);
          await viewUserDetails(userId);
        } else {
          setWalletAdjustUser("");
          setWalletAdjustAmount("");
          setWalletAdjustDesc("");
          setAdjustingUserWallet(null);
        }
        await fetchUsers();
      } else {
        showToast(body.error?.message || "Adjustment failed.", "error");
      }
    } catch (err) {
      showToast("Error adjusting wallet balance", "error");
    } finally {
      setAdjustingWallet(false);
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const queryParams = new URLSearchParams();
      if (commentSearch) queryParams.set("q", commentSearch);
      if (commentFilter) queryParams.set("filter", commentFilter);

      const res = await fetch(`/api/admin/comments?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setComments(body.data || []);
      }
    } catch (err) {
      console.error("Error fetching comments", err);
    } finally {
      setLoadingComments(false);
    }
  };

  // Hide / Restore comment
  const handleCommentAction = async (commentId: string, action: "hide" | "restore") => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Action executed successfully.", "success");
        await fetchComments();
      } else {
        showToast(body.error?.message || "Action failed.", "error");
      }
    } catch (err) {
      showToast("Error executing action", "error");
    }
  };

  // Delete comment permanently
  const handleDeleteComment = async (commentId: string, e: React.MouseEvent) => {
    const ok = await confirm("Are you sure you want to permanently delete this comment? This action is irreversible.", e.clientX, e.clientY);
    if (!ok) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: "DELETE"
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Comment deleted.", "success");
        await fetchComments();
      } else {
        showToast(body.error?.message || "Delete failed.", "error");
      }
    } catch (err) {
      showToast("Error deleting comment", "error");
    }
  };

  // Fetch email queue
  const fetchEmails = async () => {
    setLoadingEmails(true);
    try {
      const queryParams = new URLSearchParams();
      if (emailSearch) queryParams.set("q", emailSearch);
      if (emailStatusFilter) queryParams.set("status", emailStatusFilter);

      const res = await fetch(`/api/admin/emails?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setEmails(body.data || []);
      }
    } catch (err) {
      console.error("Error fetching emails", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  // Resend email trigger
  const handleResendEmail = async (emailId: string) => {
    try {
      const res = await fetch(`/api/admin/emails/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId })
      });
      const body = await res.json();
      if (res.ok) {
        showToast(body.data?.message || "Email queued for resending.", "success");
        await fetchEmails();
      } else {
        showToast(body.error?.message || "Failed to resend email.", "error");
      }
    } catch (err) {
      showToast("Error resending email", "error");
    }
  };

  // Fetch phone verifications
  const fetchPhoneVerifications = async () => {
    setLoadingPhone(true);
    try {
      const res = await fetch(`/api/admin/phone`);
      const body = await res.json();
      if (res.ok) {
        setPhoneVerifications(body.data || []);
      }
    } catch (err) {
      console.error("Error fetching phone verifications", err);
    } finally {
      setLoadingPhone(false);
    }
  };

  // Fetch reader feedbacks
  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch(`/api/admin/feedback`);
      const body = await res.json();
      if (res.ok) {
        setFeedbacks(body.data || []);
      }
    } catch (err) {
      console.error("Error fetching feedbacks", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  // Fetch active writer note
  const fetchWriterNote = async () => {
    try {
      const res = await fetch(`/api/admin/writer-note`);
      const body = await res.json();
      if (res.ok && body.data) {
        setWriterNote(body.data.content || "");
        setWriterTwitter(body.data.twitter || "");
        setWriterInstagram(body.data.instagram || "");
        setWriterFacebook(body.data.facebook || "");
        setWriterYoutube(body.data.youtube || "");
        setWriterLinkedin(body.data.linkedin || "");
      }
    } catch (err) {
      console.error("Error fetching writer note", err);
    }
  };

  // Save writer note
  const handleSaveWriterNote = async () => {
    if (!writerNote.trim()) {
      showToast("Note content cannot be empty", "error");
      return;
    }
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/admin/writer-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: writerNote,
          twitter: writerTwitter || null,
          instagram: writerInstagram || null,
          facebook: writerFacebook || null,
          youtube: writerYoutube || null,
          linkedin: writerLinkedin || null
        })
      });
      const body = await res.json();
      if (res.ok) {
        showToast("Writer's note updated successfully!", "success");
      } else {
        showToast(body.error?.message || "Failed to save writer's note", "error");
      }
    } catch (err) {
      showToast("Error saving writer's note", "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Fetch security activities
  const fetchSecurityActivities = async () => {
    setLoadingSecurity(true);
    try {
      const queryParams = new URLSearchParams();
      if (securitySearch) queryParams.set("q", securitySearch);
      if (severityFilter) queryParams.set("severity", severityFilter);
      const res = await fetch(`/api/admin/security?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setSecurityActivities(body.data?.activities || []);
      }
    } catch (err) {
      console.error("Error fetching security activities", err);
    } finally {
      setLoadingSecurity(false);
    }
  };

  // Fetch audit logs
  const fetchAuditLogs = async (page = 1) => {
    setLoadingAudit(true);
    try {
      const queryParams = new URLSearchParams();
      if (auditSearch) queryParams.set("q", auditSearch);
      if (auditActionFilter) queryParams.set("action", auditActionFilter);
      queryParams.set("page", page.toString());
      queryParams.set("limit", "20");

      const res = await fetch(`/api/admin/logs?${queryParams.toString()}`);
      const body = await res.json();
      if (res.ok) {
        setAuditLogs(body.data?.logs || []);
        setAuditPage(body.data?.pagination?.page || 1);
        setAuditTotalPages(body.data?.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error fetching audit logs", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Resolve security activity
  const handleResolveActivity = (id: string) => {
    setSecurityActivities((prev) => prev.filter((act) => act.id !== id));
    showToast("Alert marked as resolved and archived.", "success");
  };

  useEffect(() => {
    const refreshCurrentDateTime = () => setCurrentDateTimeInput(toDateTimeLocalValue(new Date()));
    refreshCurrentDateTime();
    const timer = window.setInterval(refreshCurrentDateTime, 30000);
    return () => window.clearInterval(timer);
  }, []);

  // Load pages when tab changes (Phase 3 + Phase 5 + Phase 6 + Phase 7)
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "payments") {
      fetchPayments();
    } else if (activeTab === "moderation") {
      if (modSubTab === "comments") {
        fetchComments();
      } else if (modSubTab === "emails") {
        fetchEmails();
      } else if (modSubTab === "phone") {
        fetchPhoneVerifications();
      } else if (modSubTab === "feedback") {
        fetchFeedbacks();
        fetchWriterNote();
      }
    } else if (activeTab === "security") {
      fetchSecurityActivities();
    } else if (activeTab === "audit") {
      fetchAuditLogs(1);
    } else if (activeTab === "monetization") {
      fetchMonetizationData();
    } else if (activeTab === "layouts") {
      fetchLayouts();
    }
  }, [activeTab, modSubTab, commentFilter, emailStatusFilter, severityFilter, auditActionFilter]);

  const analyticsCards = [
    { key: "totalUsers", label: "Total Users", value: formatNumber(data.analytics.totalUsers), icon: Users, detail: "Registered accounts" },
    { key: "activeUsers", label: "Active Users", value: formatNumber(data.analytics.activeUsers), icon: Activity, detail: "Accounts in active status" },
    { key: "verifiedEmail", label: "Verified Email", value: formatNumber(data.analytics.verifiedUsers), icon: ShieldCheck, detail: "Email verified users" },
    { key: "verifiedPhone", label: "Verified Phone", value: formatNumber(data.analytics.verifiedPhoneUsers), icon: ShieldCheck, detail: "OTP verified phone users" },
    { key: "totalRevenue", label: "Total Revenue", value: `Rs. ${formatNumber(data.analytics.totalRevenue)}`, icon: CreditCard, detail: "All-time sales" },
    { key: "monthlyRevenue", label: "Monthly Revenue", value: `Rs. ${formatNumber(data.analytics.monthlyRevenue)}`, icon: Calendar, detail: "Last 30 days revenue" },
    { key: "subscriptionRevenue", label: "Subscription Revenue", value: `Rs. ${formatNumber(data.subscriptionStats.totalRevenue)}`, icon: Crown, detail: "Active subscription revenue" },
    { key: "coinSales", label: "Coin Sales", value: `${formatNumber(data.analytics.totalCoinSales)}`, icon: Coins, detail: "Total coins credited" },
    { key: "pendingRefunds", label: "Pending Refunds", value: formatNumber(data.analytics.pendingRefunds), icon: RotateCcw, detail: "Refund requests queue" },
    { key: "failedPayments", label: "Failed Payments", value: formatNumber(data.analytics.failedPayments), icon: AlertTriangle, detail: "Razorpay check errors" },
    { key: "newRegistrations", label: "New Registrations", value: formatNumber(data.analytics.newRegistrations), icon: Users, detail: "Signed up last 30 days" },
    { key: "conversionRate", label: "Conversion Rate", value: `${data.analytics.conversionRate.toFixed(1)}%`, icon: BarChart3, detail: "Paying / total users" },
    { key: "totalStories", label: "Total Stories", value: formatNumber(data.analytics.totalStories), icon: BookOpen, detail: "Published and draft stories" },
    { key: "totalChapters", label: "Total Chapters", value: formatNumber(data.analytics.totalChapters), icon: FileText, detail: "Total manuscript chapters" },
    { key: "studioLinks", label: "Studio Links", value: formatNumber(data.studioProjects.length), icon: Link2, detail: "Connected writing projects" }
  ];

  const publishedStories = data.stories.filter((s) => s.published !== false);
  const unpublishedStories = data.stories.filter((s) => s.published === false);
  const studioProjectsSimple = data.studioProjects;

  const studioBaseUrl = process.env.NEXT_PUBLIC_WRITING_STUDIO_URL?.trim() || DEFAULT_WRITING_STUDIO_URL;
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

  // --- SVG Custom Charts Computation ---
  const timeline = data.chartData.timeline;
  const maxRevenue = Math.max(...timeline.map((t) => t.revenue), 10);
  const maxSignups = Math.max(...timeline.map((t) => t.users), 5);

  const chartW = 600;
  const chartH = 150;

  // Generate revenue line points
  const revenuePoints = timeline
    .map((t, idx) => {
      const x = (idx / (timeline.length - 1)) * chartW;
      const y = chartH - (t.revenue / maxRevenue) * chartH;
      return `${x},${y}`;
    })
    .join(" ");
  const revenueAreaPath = `M 0,${chartH} L ${revenuePoints} L ${chartW},${chartH} Z`;
  const revenueLinePath = `M ${revenuePoints}`;

  return (
    <main className="min-h-screen bg-paper no-scrollbar">
      {/* Upper Navigation Header */}
      <header className="lm-topbar admin-header bg-surface border-b border-border">
        <nav className="admin-nav mx-auto flex max-w-9xl items-center justify-between gap-4 px-5 pb-4 pt-2">
          <Link href="/" className="admin-back-to-marketplace inline-flex items-center gap-2 text-lg font-semibold text-soft-ink transition hover:text-accent mt-2">
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>
          <div className="flex items-center gap-3">
            <span className="admin-mfa-badge rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success mt-2.5">
              Admin Console Active
            </span>
            <ThemeSwitcher compact />
          </div>
        </nav>
      </header>

      {/* Main Admin Content Layout */}
      <div className="mx-auto max-w-[90%] px-5 py-8">
        <div className="">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1 W-5 fixed left-25 top-25 w-[250px]">
            <div className="flex flex-row overflow-x-auto pb-3 gap-1.5 border-b border-border/80 lg:flex-col lg:overflow-visible lg:pb-0 lg:border-b-0 lg:border-r lg:border-border/60 lg:pr-4 lg:gap-1.5 no-scrollbar">
              {[
                { id: "overview", label: "Dashboard Overview", icon: BarChart3 },
                { id: "users", label: "User Management", icon: Users },
                { id: "stories", label: "Stories & Chapters", icon: BookOpen },
                { id: "monetization", label: "Monetization Manager", icon: Coins },
                { id: "payments", label: "Payments & Wallet", icon: CreditCard },
                { id: "moderation", label: "Moderation & Queues", icon: MessageSquare },
                { id: "security", label: "Security Center", icon: ShieldAlert },
                { id: "audit", label: "Audit Logs", icon: ListChecks },
                { id: "layouts", label: "Layouts & Styling", icon: Layout }
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 text-md font-medium transition-all whitespace-nowrap rounded-lg ${active
                      ? "bg-accent text-paper shadow-sm shadow-accent/20"
                      : "text-soft-ink hover:text-ink hover:bg-muted/5"
                      }`}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main Viewport Panel */}
          <div className="ml-[300px] lg:col-span-3">

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <section className="space-y-8 animate-in fade-in duration-200">
                {/* Header Description */}
                <div>
                  <h1 className="font-display text-4xl font-semibold text-ink">Dashboard Overview</h1>
                  <p className="mt-1 text-sm text-muted">Real-time revenue metrics, user metrics, and content health audits.</p>
                </div>

                {/* Categorized KPIs Analytics Grid */}
                <div className="space-y-6">
                  {/* Category 1: User Accounts & Registrations */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-accent" />
                      User Accounts & Registrations (यूज़र विश्लेषिकी)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      {analyticsCards
                        .filter((card) => ["totalUsers", "activeUsers", "verifiedEmail", "verifiedPhone", "newRegistrations"].includes(card.key))
                        .map((card) => (
                          <div
                            key={card.key}
                            onClick={() => {
                              setSelectedMetric(card.key);
                              fetchUsers(true);
                            }}
                            className="lm-card bg-surface p-5 border border-border rounded-xl transition hover:shadow-luxury cursor-pointer hover:border-accent/40 hover:-translate-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</span>
                              <card.icon className="h-5 w-5 text-accent opacity-80" />
                            </div>
                            <strong className="mt-3 block font-display text-3xl font-semibold text-ink">{card.value}</strong>
                            <span className="mt-1 block text-xs text-muted">{card.detail}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 2: Finance & Revenue Performance */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-accent" />
                      Finance & Revenue Performance (वित्तीय विश्लेषिकी)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                      {analyticsCards
                        .filter((card) => ["totalRevenue", "monthlyRevenue", "subscriptionRevenue", "coinSales", "conversionRate"].includes(card.key))
                        .map((card) => (
                          <div
                            key={card.key}
                            onClick={() => {
                              setSelectedMetric(card.key);
                              fetchPayments(true);
                            }}
                            className="lm-card bg-surface p-5 border border-border rounded-xl transition hover:shadow-luxury cursor-pointer hover:border-accent/40 hover:-translate-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</span>
                              <card.icon className="h-5 w-5 text-accent opacity-80" />
                            </div>
                            <strong className="mt-3 block font-display text-3xl font-semibold text-ink">{card.value}</strong>
                            <span className="mt-1 block text-xs text-muted">{card.detail}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 3: Action Required */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <AlertOctagon className="h-3.5 w-3.5 text-danger" />
                      Action Required & System Audits (आवश्यक कार्रवाई)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                      {analyticsCards
                        .filter((card) => ["pendingRefunds", "failedPayments"].includes(card.key))
                        .map((card) => (
                          <div
                            key={card.key}
                            onClick={() => {
                              setSelectedMetric(card.key);
                              fetchPayments(true);
                            }}
                            className="lm-card bg-surface p-5 border border-danger/25 rounded-xl transition hover:shadow-luxury cursor-pointer hover:border-danger/40 hover:-translate-y-0.5 bg-danger/5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-danger">{card.label}</span>
                              <card.icon className="h-5 w-5 text-danger opacity-85" />
                            </div>
                            <strong className="mt-3 block font-display text-3xl font-semibold text-danger">{card.value}</strong>
                            <span className="mt-1 block text-xs text-muted">{card.detail}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Category 4: Content & Writer Studio */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-accent" />
                      Content & Writer Studio (कंटेंट और स्टूडियो विश्लेषिकी)
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                      {analyticsCards
                        .filter((card) => ["totalStories", "totalChapters", "studioLinks"].includes(card.key))
                        .map((card) => (
                          <div
                            key={card.key}
                            onClick={() => {
                              setSelectedMetric(card.key);
                            }}
                            className="lm-card bg-surface p-5 border border-border rounded-xl transition hover:shadow-luxury cursor-pointer hover:border-accent/40 hover:-translate-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</span>
                              <card.icon className="h-5 w-5 text-accent opacity-80" />
                            </div>
                            <strong className="mt-3 block font-display text-3xl font-semibold text-ink">{card.value}</strong>
                            <span className="mt-1 block text-xs text-muted">{card.detail}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* SVG Charts Section */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Chart 1: Revenue Timeline (30 days) */}
                  <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">30-Day Revenue Trend</h3>
                    <p className="text-xs text-muted mb-4">Total revenue collected daily over the last 30 days.</p>
                    <div className="relative">
                      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 overflow-visible">
                        <defs>
                          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1={chartH / 2} x2={chartW} y2={chartH / 2} stroke="var(--border)" strokeDasharray="3 3" />
                        <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--border)" />
                        {/* Area shading */}
                        <path d={revenueAreaPath} fill="url(#revGrad)" />
                        {/* Line stroke */}
                        <path d={revenueLinePath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
                      </svg>
                      {/* Timeline Dates */}
                      <div className="flex justify-between mt-2 text-[10px] text-muted font-mono">
                        <span>{timeline[0]?.date || "30 days ago"}</span>
                        <span>{timeline[15]?.date || ""}</span>
                        <span>{timeline[timeline.length - 1]?.date || "Today"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Chart 2: Daily User Signups (30 days) */}
                  <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">30-Day User Growth</h3>
                    <p className="text-xs text-muted mb-4">Daily reader registrations on the platform.</p>
                    <div className="relative">
                      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-44 overflow-visible">
                        {/* Grid lines */}
                        <line x1="0" y1={chartH / 2} x2={chartW} y2={chartH / 2} stroke="var(--border)" strokeDasharray="3 3" />
                        <line x1="0" y1={chartH} x2={chartW} y2={chartH} stroke="var(--border)" />
                        {/* Bar columns */}
                        {timeline.map((t, idx) => {
                          const barW = (chartW / timeline.length) * 0.7;
                          const x = (idx / timeline.length) * chartW + (chartW / timeline.length) * 0.15;
                          const barH = (t.users / maxSignups) * (chartH - 20) || 2; // min height 2px
                          const y = chartH - barH;
                          return (
                            <rect
                              key={idx}
                              x={x}
                              y={y}
                              width={barW}
                              height={barH}
                              fill="var(--accent2)"
                              rx="1.5"
                              className="transition-all hover:opacity-85"
                            >
                              <title>{`${t.date}: ${t.users} users`}</title>
                            </rect>
                          );
                        })}
                      </svg>
                      {/* Timeline Dates */}
                      <div className="flex justify-between mt-2 text-[10px] text-muted font-mono">
                        <span>{timeline[0]?.date || "30 days ago"}</span>
                        <span>{timeline[15]?.date || ""}</span>
                        <span>{timeline[timeline.length - 1]?.date || "Today"}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popularity Splits */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Popular stories */}
                  <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">Top Story Performance</h3>
                    <p className="text-xs text-muted mb-4">Ranked by reads count and engagement bookmarks.</p>
                    <div className="space-y-4">
                      {data.chartData.storyPopularity.map((s, idx) => {
                        const maxReads = Math.max(...data.chartData.storyPopularity.map((story) => story.reads), 100);
                        const pct = (s.reads / maxReads) * 100;
                        return (
                          <div key={s.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <strong className="text-ink truncate max-w-[240px]">
                                {idx + 1}. {s.title}
                              </strong>
                              <span className="text-muted font-mono">{formatNumber(s.reads)} reads</span>
                            </div>
                            <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
                              <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex gap-4 text-xs text-muted">
                              <span>🔖 {formatNumber(s.bookmarks)} Bookmarks</span>
                              <span>💬 {formatNumber(s.comments)} Comments</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Most viewed chapters */}
                  <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                    <h3 className="font-display text-lg font-semibold text-ink mb-1">Most Active Chapters</h3>
                    <p className="text-xs text-muted mb-4">Ranked by active reading logs and purchase unlocks.</p>
                    <div className="divide-y divide-border">
                      {data.chartData.mostViewedChapters.map((ch, idx) => (
                        <div key={ch.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                          <div>
                            <strong className="block text-sm text-ink truncate max-w-[280px]">{idx + 1}. {ch.title}</strong>
                            <span className="text-xs text-muted truncate block max-w-[280px]">{ch.storyTitle}</span>
                          </div>
                          <div className="text-right text-xs text-muted">
                            <span className="block font-semibold text-ink">{formatNumber(ch.views)} reads</span>
                            <span className="block">{formatNumber(ch.unlocks)} purchases</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: USERS */}
            {activeTab === "users" && (
              <section className="space-y-6 animate-in fade-in duration-200">
                {/* Header search section */}
                <div className="grid lg:grid-cols-[385px_1fr] md:items-center bg-surface-soft/40 border border-border/80 p-5 rounded-2xl shadow-sm backdrop-blur-xl relative z-20">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink">User Accounts Registry</h2>
                    <p className="text-xs text-muted mt-0.5">Filter by status, search emails, view logs, and suspend accounts.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search user, email, name..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="lm-input max-w-xs text-sm py-2 px-4 h-10 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    />
                    <CustomSelect
                      value={roleFilter}
                      onChange={setRoleFilter}
                      options={[
                        { value: "", label: "All Roles" },
                        { value: "READER", label: "Reader" },
                        { value: "AUTHOR", label: "Author" },
                        { value: "ADMIN", label: "Admin" },
                      ]}
                      className="max-w-[140px]"
                    />
                    <CustomSelect
                      value={statusFilter}
                      onChange={setStatusFilter}
                      options={[
                        { value: "", label: "All Statuses" },
                        { value: "ACTIVE", label: "Active" },
                        { value: "SUSPENDED", label: "Suspended" },
                        { value: "BANNED", label: "Banned" },
                      ]}
                      className="max-w-[140px]"
                    />
                    <button
                      onClick={() => fetchUsers()}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold transition bg-accent text-paper hover:bg-accent-light"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Users list table */}
                <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                  {loadingUsers ? (
                    <div className="py-20 text-center text-muted">Loading users database...</div>
                  ) : users.length === 0 ? (
                    <div className="py-20 text-center text-muted">No users found matching query filters.</div>
                  ) : (
                    <div className="overflow-y-hidden max-h-[1000px]">
                      <table className="w-full min-w-[960px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                          <tr>
                            <th className="py-3 pr-4">User Info</th>
                            <th className="py-3 pr-4">Role</th>
                            <th className="py-3 pr-4">Status</th>
                            <th className="py-3 pr-4">Wallet Balance</th>
                            <th className="py-3 pr-4">Email verified</th>
                            <th className="py-3 pr-4">Phone verified</th>
                            <th className="py-3 pr-4">Joined date</th>
                            <th className="py-3 pr-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {users.map((user) => (
                            <tr key={user.id} className="align-middle hover:bg-surface-soft/40 transition">
                              <td className="py-4 pr-4">
                                <strong className="block text-ink">{user.displayName || user.username}</strong>
                                <span className="text-xs text-muted font-mono">{user.email}</span>
                              </td>
                              <td className="py-4 pr-4">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold tracking-wider ${user.role === "ADMIN" ? "bg-accent-soft text-accent3" :
                                  user.role === "AUTHOR" ? "bg-warning/10 text-warning" : "bg-surface-soft text-muted"
                                  }`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-4 pr-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${user.status === "ACTIVE" ? "bg-success/15 text-success" :
                                  user.status === "SUSPENDED" ? "bg-warning/15 text-warning" : "bg-danger/10 text-danger"
                                  }`}>
                                  {user.status.toLowerCase()}
                                </span>
                              </td>
                              <td className="py-4 pr-4 font-mono font-semibold text-ink">
                                {formatNumber(user.wallet?.balance ?? 0)} Coins
                              </td>
                              <td className="py-4 pr-4">
                                {user.emailVerifiedAt ? (
                                  <span className="text-success font-semibold flex items-center gap-1 text-xs">✓ Verified</span>
                                ) : (
                                  <span className="text-danger flex items-center gap-1 text-xs">✕ Unverified</span>
                                )}
                              </td>
                              <td className="py-4 pr-4">
                                {user.phoneVerifiedAt ? (
                                  <span className="text-success font-semibold flex items-center gap-1 text-xs">✓ Verified</span>
                                ) : (
                                  <span className="text-danger flex items-center gap-1 text-xs">✕ Unverified</span>
                                )}
                              </td>
                              <td className="py-4 pr-4 text-xs text-muted">
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-4 pr-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => viewUserDetails(user.id)}
                                    className="lm-btn-secondary px-2.5 py-1 text-xs font-semibold"
                                  >
                                    Details
                                  </button>
                                  {user.status === "ACTIVE" ? (
                                    <button
                                      onClick={(e) => executeUserAction(user.id, "suspend", e)}
                                      className="px-2.5 py-1 text-xs font-semibold text-warning border border-warning/30 bg-warning/5 rounded-lg hover:bg-warning/10"
                                    >
                                      Suspend
                                    </button>
                                  ) : user.status === "SUSPENDED" ? (
                                    <button
                                      onClick={(e) => executeUserAction(user.id, "unsuspend", e)}
                                      className="px-2.5 py-1 text-xs font-semibold text-success border border-success/30 bg-success/5 rounded-lg hover:bg-success/10"
                                    >
                                      Activate
                                    </button>
                                  ) : null}

                                  {user.status !== "BANNED" ? (
                                    <button
                                      onClick={(e) => executeUserAction(user.id, "ban", e)}
                                      className="px-2.5 py-1 text-xs font-semibold text-danger border border-danger/30 bg-danger/5 rounded-lg hover:bg-danger/10"
                                    >
                                      Ban
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => executeUserAction(user.id, "unsuspend", e)}
                                      className="px-2.5 py-1 text-xs font-semibold text-success border border-success/30 bg-success/5 rounded-lg hover:bg-success/10"
                                    >
                                      Unban
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Dynamic User Details Overlay Modal */}
                {selectedUser && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-surface border border-border w-full max-w-4xl rounded-2xl shadow-luxury flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                      {/* Modal Header */}
                      <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
                        <div>
                          <h3 className="font-display text-xl font-semibold text-ink">User Profile Details</h3>
                          <p className="text-xs text-muted">ID: <code className="font-mono">{selectedUser.user.id}</code></p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setInlineAdjustOpen(false);
                          }}
                          className="text-muted hover:text-ink font-bold text-lg p-1.5 rounded-lg hover:bg-surface-soft"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Modal Content Wrapper */}
                      <div className="flex-1 overflow-y-auto p-6 grid gap-6 md:grid-cols-[1.1fr_1.9fr]">
                        {/* Left Panel: Profile summary & Action list */}
                        <div className="space-y-4">
                          <div className="p-4 border border-border rounded-xl bg-surface-soft/20 space-y-4">
                            <div className="text-center pb-4 border-b border-border">
                              <div className="h-16 w-16 bg-accent/15 rounded-full flex items-center justify-center text-accent font-semibold text-2xl mx-auto mb-2">
                                {(selectedUser.user.displayName || selectedUser.user.username)[0].toUpperCase()}
                              </div>
                              <strong className="block text-lg text-ink truncate">{selectedUser.user.displayName || selectedUser.user.username}</strong>
                              <span className="text-xs text-muted truncate block">{selectedUser.user.email}</span>
                              <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-accent-soft text-accent3 uppercase tracking-wider">{selectedUser.user.role}</span>
                            </div>

                            <div className="space-y-2 text-sm text-ink">
                              <div className="flex justify-between"><span className="text-muted">Status:</span> <strong className={selectedUser.user.status === "ACTIVE" ? "text-success" : "text-danger"}>{selectedUser.user.status}</strong></div>
                              <div className="flex justify-between"><span className="text-muted">Coins Balance:</span> <strong>{formatNumber(selectedUser.user.wallet?.balance ?? 0)} Coins</strong></div>
                              <div className="flex justify-between"><span className="text-muted">Phone No:</span> <span className="text-muted truncate">{selectedUser.user.phone || "Not set"}</span></div>
                              <div className="flex justify-between"><span className="text-muted">Joined:</span> <span>{new Date(selectedUser.user.createdAt).toLocaleDateString()}</span></div>
                            </div>

                            {/* Inline wallet adjustments */}
                            <div className="pt-3 border-t border-border">
                              {!inlineAdjustOpen ? (
                                <button
                                  onClick={() => setInlineAdjustOpen(true)}
                                  className="w-full lm-btn-primary py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                                >
                                  <Coins className="h-3.5 w-3.5" /> Adjust User Coins
                                </button>
                              ) : (
                                <div className="space-y-3 bg-surface border border-border p-3 rounded-lg text-xs animate-in slide-in-from-top-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-semibold text-ink">Adjust Wallet Balance</span>
                                    <button onClick={() => setInlineAdjustOpen(false)} className="text-muted hover:text-ink">✕</button>
                                  </div>

                                  <div className="grid grid-cols-3 gap-1">
                                    {[
                                      { id: "credit", label: "Credit (+)" },
                                      { id: "debit", label: "Debit (-)" },
                                      { id: "set", label: "Set (=)" }
                                    ].map((act) => (
                                      <button
                                        key={act.id}
                                        type="button"
                                        onClick={() => setInlineAdjustAction(act.id)}
                                        className={`py-1 text-center rounded border ${inlineAdjustAction === act.id
                                          ? "bg-accent border-accent text-paper font-bold"
                                          : "border-border text-muted hover:bg-surface-soft"
                                          }`}
                                      >
                                        {act.label}
                                      </button>
                                    ))}
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-muted mb-0.5">Amount (Coins)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={inlineAdjustAmount}
                                      onChange={(e) => setInlineAdjustAmount(e.target.value)}
                                      className="lm-input py-1 text-xs w-full"
                                      placeholder="0"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] text-muted mb-0.5">Description (Audit log reason)</label>
                                    <input
                                      type="text"
                                      value={inlineAdjustDesc}
                                      onChange={(e) => setInlineAdjustDesc(e.target.value)}
                                      className="lm-input py-1 text-xs w-full"
                                      placeholder="e.g. Campaign bonus credits"
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    disabled={adjustingWallet}
                                    onClick={() => handleAdjustWallet(selectedUser.user.id, true)}
                                    className="w-full lm-btn-primary py-1.5 text-center text-xs font-semibold"
                                  >
                                    {adjustingWallet ? "Adjusting..." : "Apply Balance Update"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Moderator Quick Actions list */}
                          <div className="p-4 border border-border rounded-xl space-y-3">
                            <h4 className="font-semibold text-ink text-sm flex items-center gap-1.5"><ShieldAlert className="h-4 w-4 text-accent" /> Moderator Quick Controls</h4>

                            <div className="grid gap-2 text-xs">
                              {selectedUser.user.status === "ACTIVE" ? (
                                <button
                                  disabled={actionLoading}
                                  onClick={(e) => executeUserAction(selectedUser.user.id, "suspend", e)}
                                  className="w-full lm-btn-secondary py-2 text-warning hover:bg-warning/5 font-semibold text-center"
                                >
                                  Suspend Account
                                </button>
                              ) : (
                                <button
                                  disabled={actionLoading}
                                  onClick={(e) => executeUserAction(selectedUser.user.id, "unsuspend", e)}
                                  className="w-full lm-btn-secondary py-2 text-success hover:bg-success/5 font-semibold text-center"
                                >
                                  Activate Account
                                </button>
                              )}

                              <button
                                disabled={actionLoading}
                                onClick={(e) => executeUserAction(selectedUser.user.id, "force-logout", e)}
                                className="w-full lm-btn-secondary py-2 text-soft-ink font-semibold text-center"
                              >
                                Revoke Active Sessions
                              </button>

                              <button
                                disabled={actionLoading}
                                onClick={(e) => executeUserAction(selectedUser.user.id, "reset-verification", e)}
                                className="w-full lm-btn-secondary py-2 text-soft-ink font-semibold text-center"
                              >
                                Reset Verification Flag
                              </button>

                              {selectedUser.user.status !== "BANNED" && (
                                <button
                                  disabled={actionLoading}
                                  onClick={(e) => executeUserAction(selectedUser.user.id, "ban", e)}
                                  className="w-full py-2 bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 font-semibold rounded-lg text-center"
                                >
                                  Ban / Block User Permanent
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Panel: Transaction, Purchases, Reading, Bookmarks tabs */}
                        <div className="flex flex-col border border-border rounded-xl overflow-hidden bg-surface">
                          <div className="flex bg-surface-soft/60 border-b border-border text-xs font-semibold">
                            {[
                              { id: "wallet", label: "Ledger", icon: Coins },
                              { id: "purchases", label: "Chapter Unlocks", icon: Crown },
                              { id: "reading", label: "Reading History", icon: History },
                              { id: "bookmarks", label: "Bookmarks", icon: Bookmark }
                            ].map((subTab) => {
                              const Icon = subTab.icon;
                              const active = detailTab === subTab.id;
                              return (
                                <button
                                  key={subTab.id}
                                  onClick={() => setDetailTab(subTab.id as any)}
                                  className={`flex-1 flex items-center justify-center gap-1 py-3 text-center transition ${active ? "bg-surface text-accent font-bold border-r border-l border-border first:border-l-0" : "text-muted hover:text-ink"
                                    }`}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                  {subTab.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Tab Content Panels */}
                          <div className="flex-1 p-4 overflow-y-auto max-h-[480px]">
                            {/* 1. Wallet transactions ledger */}
                            {detailTab === "wallet" && (
                              <div className="space-y-2">
                                {selectedUser.transactions.length === 0 ? (
                                  <p className="text-center text-xs text-muted py-10">No coin transactions logged.</p>
                                ) : (
                                  selectedUser.transactions.map((tx: any) => (
                                    <div key={tx.id} className="p-3 border border-border rounded-lg flex items-center justify-between text-xs hover:bg-surface-soft/20 animate-in fade-in">
                                      <div>
                                        <strong className="block text-ink text-sm">{tx.description}</strong>
                                        <span className="text-[10px] text-muted font-mono">{new Date(tx.createdAt).toLocaleString()}</span>
                                        <span className="block text-[10px] text-muted">ID: {tx.id}</span>
                                      </div>
                                      <div className="text-right">
                                        <strong className={`block text-sm ${tx.amount >= 0 ? "text-success" : "text-danger"}`}>
                                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} Coins
                                        </strong>
                                        <span className="text-[10px] text-muted">After: {tx.balanceAfter}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* 2. Chapter Unlocks */}
                            {detailTab === "purchases" && (
                              <div className="space-y-2">
                                {selectedUser.purchases.length === 0 ? (
                                  <p className="text-center text-xs text-muted py-10">No premium chapter unlocks found.</p>
                                ) : (
                                  selectedUser.purchases.map((purchase: any) => (
                                    <div key={purchase.id} className="p-3 border border-border rounded-lg flex items-center justify-between text-xs hover:bg-surface-soft/20 animate-in fade-in">
                                      <div>
                                        <strong className="block text-ink text-sm">{purchase.chapter.story.title}</strong>
                                        <span className="text-muted">Chapter {purchase.chapter.number}: {purchase.chapter.title}</span>
                                        <span className="block text-[10px] text-muted font-mono mt-0.5">Watermark ID: {purchase.fingerprint}</span>
                                      </div>
                                      <div className="text-right">
                                        <strong className="block text-sm text-accent">-{purchase.coinCost} Coins</strong>
                                        <span className="text-[10px] text-muted font-mono">{new Date(purchase.createdAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* 3. Reading History */}
                            {detailTab === "reading" && (
                              <div className="space-y-2">
                                {selectedUser.readingHistory.length === 0 ? (
                                  <p className="text-center text-xs text-muted py-10">No reading history logged.</p>
                                ) : (
                                  selectedUser.readingHistory.map((hist: any) => (
                                    <div key={hist.id} className="p-3 border border-border rounded-lg flex items-center justify-between text-xs hover:bg-surface-soft/20 animate-in fade-in">
                                      <div>
                                        <strong className="block text-ink text-sm">{hist.story.title}</strong>
                                        <span className="text-muted">Chapter {hist.chapter.number}: {hist.chapter.title}</span>
                                      </div>
                                      <div className="text-right text-[10px] text-muted">
                                        <span className="block font-semibold text-ink">{hist.progressPct}% read</span>
                                        <span className="block font-mono mt-0.5">{new Date(hist.lastReadAt).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}

                            {/* 4. Bookmarks */}
                            {detailTab === "bookmarks" && (
                              <div className="space-y-2">
                                {selectedUser.bookmarks.length === 0 ? (
                                  <p className="text-center text-xs text-muted py-10">No bookmarks saved.</p>
                                ) : (
                                  selectedUser.bookmarks.map((bmark: any) => (
                                    <div key={bmark.id} className="p-3 border border-border rounded-lg text-xs hover:bg-surface-soft/20 animate-in fade-in">
                                      <div className="flex justify-between">
                                        <strong className="text-ink text-sm">{bmark.story.title}</strong>
                                        <span className="text-[10px] text-muted font-mono">{new Date(bmark.createdAt).toLocaleDateString()}</span>
                                      </div>
                                      <span className="block text-muted">Chapter {bmark.chapter.number}: {bmark.chapter.title}</span>
                                      {bmark.note && (
                                        <p className="mt-1 bg-surface-soft p-2 rounded text-[11px] italic text-soft-ink">Note: "{bmark.note}"</p>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* TAB 3: STORIES */}
            {activeTab === "stories" && (
              <section className="space-y-8 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink">Stories & Chapters Catalog</h2>
                    <p className="text-sm text-muted">Edit metadata, schedule publication, set coin pricing, or synchronize studio projects.</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/admin/create-story" className="lm-btn-secondary py-2 text-sm">
                      + New Story
                    </Link>
                  </div>
                </div>

                <div className="space-y-6">
                  <PublishedStoriesSection
                    stories={publishedStories}
                    studioBaseUrl={studioBaseUrl}
                    platformUrl={platformUrl}
                    studioProjects={studioProjectsSimple}
                  />
                </div>

                {unpublishedStories.length > 0 && (
                  <UnpublishedStoriesSection
                    stories={unpublishedStories}
                    studioBaseUrl={studioBaseUrl}
                    platformUrl={platformUrl}
                    studioProjects={studioProjectsSimple}
                  />
                )}
              </section>
            )}

            {/* TAB 4: PAYMENTS & WALLET */}
            {activeTab === "payments" && (
              <section className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-row gap-4 md:items-left md:justify-between bg-surface-soft/40 border border-border/80 p-5 rounded-2xl shadow-sm backdrop-blur-xl relative z-20">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink">Transaction History Ledger</h2>
                    <p className="text-xs text-muted mt-0.5">Approve refunds or verify Razorpay check-sums.</p>
                  </div>
                  <div className="flex flex-row items-center gap-3">
                    <input
                      type="text"
                      placeholder="User, order ID, payment ID..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="lm-input max-w-xs text-sm py-2 px-4 h-10 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    />
                    <CustomSelect
                      value={paymentStatusFilter}
                      onChange={setPaymentStatusFilter}
                      options={[
                        { value: "", label: "All Statuses" },
                        { value: "PAID", label: "Paid" },
                        { value: "PENDING", label: "Pending" },
                        { value: "FAILED", label: "Failed" },
                        { value: "REFUNDED", label: "Refunded" },
                        { value: "CREATED", label: "Created" }
                      ]}
                      size="sm"
                      className="max-w-[140px]"
                      triggerClassName="bg-surface border-border hover:border-accent text-xs h-10 w-[140px]"
                    />
                    <button
                      onClick={() => fetchPayments()}
                      className="inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold transition bg-accent text-paper hover:bg-accent-light"
                    >
                      Search
                    </button>
                  </div>
                </div>

                {/* Payments Table list */}
                <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                  {loadingPayments ? (
                    <div className="py-20 text-center text-muted">Loading payments database...</div>
                  ) : payments.length === 0 ? (
                    <div className="py-20 text-center text-muted">No transactions found matching filters.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[960px] text-left text-sm">
                        <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                          <tr>
                            <th className="py-3 pr-4">User</th>
                            <th className="py-3 pr-4">Package Details</th>
                            <th className="py-3 pr-4">Order ID</th>
                            <th className="py-3 pr-4">Payment ID</th>
                            <th className="py-3 pr-4">Amount</th>
                            <th className="py-3 pr-4">Coins</th>
                            <th className="py-3 pr-4">Status</th>
                            <th className="py-3 pr-4 text-right">Refund / Verify Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {payments.map((payment) => {
                            const isPaid = payment.status === "paid";
                            const isRefunded = payment.status === "refunded";
                            const isPendingOrFailed = payment.status === "pending" || payment.status === "failed";
                            const hasRefundRequested = payment.rawPayload?.refundRequested === true;

                            return (
                              <tr key={payment.id} className="align-middle hover:bg-surface-soft/40 transition">
                                <td className="py-4 pr-4">
                                  <strong className="block text-ink">{payment.user}</strong>
                                  <span className="text-xs text-muted block truncate max-w-[140px]">{payment.email}</span>
                                </td>
                                <td className="py-4 pr-4">
                                  {payment.packageName}
                                  <span className="block text-[10px] text-muted">{payment.date} · {payment.method}</span>
                                </td>
                                <td className="py-4 pr-4 font-mono text-xs truncate max-w-[120px]" title={payment.orderId}>{payment.orderId}</td>
                                <td className="py-4 pr-4 font-mono text-xs truncate max-w-[120px]" title={payment.paymentId}>{payment.paymentId}</td>
                                <td className="py-4 pr-4 text-ink font-semibold">Rs. {payment.amountPaid}</td>
                                <td className="py-4 pr-4 font-mono font-semibold">{payment.coinsReceived}</td>
                                <td className="py-4 pr-4">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isPaid ? "bg-success/15 text-success" :
                                    isRefunded ? "bg-muted-soft text-muted" :
                                      payment.status === "failed" ? "bg-danger/10 text-danger" : "bg-warning/15 text-warning"
                                    }`}>
                                    {payment.status}
                                  </span>
                                  {hasRefundRequested && (
                                    <span className="block text-[9px] font-bold text-danger uppercase mt-1 animate-pulse">Refund Requested</span>
                                  )}
                                </td>
                                <td className="py-4 pr-4 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setAdjustingUserWallet({
                                          id: payment.userId,
                                          email: payment.email,
                                          user: payment.user
                                        });
                                        setWalletAdjustAction("credit");
                                        setWalletAdjustAmount("");
                                        setWalletAdjustDesc("");
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-accent border border-accent/25 bg-accent/5 rounded-lg hover:bg-accent/10 flex items-center gap-1.5 transition"
                                      title="Adjust Wallet Balance"
                                    >
                                      <Coins className="h-3.5 w-3.5" />
                                      Adjust Balance
                                    </button>

                                    {/* Verification Retry for Pending/Failed transactions */}
                                    {isPendingOrFailed && (
                                      <button
                                        disabled={verifyingPaymentId === payment.id}
                                        onClick={() => handleVerifyPayment(payment.id)}
                                        className="lm-btn-secondary px-2.5 py-1 text-xs font-semibold"
                                      >
                                        {verifyingPaymentId === payment.id ? "Checking..." : "Verify"}
                                      </button>
                                    )}

                                    {/* Refund options for Paid transactions */}
                                    {isPaid && (
                                      <>
                                        <button
                                          disabled={refundingPaymentId === payment.id}
                                          onClick={(e) => handleRefundPayment(payment.id, "approve", e)}
                                          className="px-2.5 py-1 text-xs font-semibold text-danger border border-danger/30 bg-danger/5 rounded-lg hover:bg-danger/10"
                                        >
                                          {refundingPaymentId === payment.id ? "Processing..." : "Refund"}
                                        </button>
                                        {hasRefundRequested && (
                                          <button
                                            disabled={refundingPaymentId === payment.id}
                                            onClick={(e) => handleRefundPayment(payment.id, "reject", e)}
                                            className="px-2 py-1 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-surface-soft"
                                            title="Reject refund request"
                                          >
                                            Reject
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 5: MODERATION & QUEUES */}
            {activeTab === "moderation" && (
              <section className="space-y-6 animate-in fade-in duration-200">
                {/* Moderation Sub Tabs */}
                <div className="flex border-b border-border bg-surface rounded-xl overflow-hidden p-1 gap-1">
                  {[
                    { id: "comments", label: "Comment Moderation Queue", icon: MessageSquare },
                    { id: "emails", label: "Email Outbox Queue", icon: Mail },
                    { id: "phone", label: "SMS Phone OTP logs", icon: Smartphone },
                    { id: "feedback", label: "Reader Feedback & Notes", icon: Heart }
                  ].map((subTab) => {
                    const Icon = subTab.icon;
                    const active = modSubTab === subTab.id;
                    return (
                      <button
                        key={subTab.id}
                        onClick={() => setModSubTab(subTab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg transition ${active
                          ? "bg-accent text-paper font-bold"
                          : "text-muted hover:text-ink hover:bg-surface-soft/50"
                          }`}
                      >
                        <Icon className="h-4 w-4" />
                        {subTab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Sub Tab Panel 1: Comments Moderation Queue */}
                {modSubTab === "comments" && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface border border-border p-6 rounded-xl relative z-20">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">Reader Comments Moderation</h2>
                        <p className="text-sm text-muted">Review comment texts, check report logs, hide offensive copy, or delete permanently.</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Search comment body..."
                          value={commentSearch}
                          onChange={(e) => setCommentSearch(e.target.value)}
                          className="lm-input max-w-xs text-sm"
                        />
                        <CustomSelect
                          value={commentFilter}
                          onChange={setCommentFilter}
                          options={[
                            { value: "", label: "All Comments" },
                            { value: "reported", label: "Reported Only" },
                            { value: "hidden", label: "Hidden Only" }
                          ]}
                          size="sm"
                          className="w-40"
                          triggerClassName="bg-surface border-border hover:border-accent text-xs h-10 w-[160px]"
                        />
                        <button onClick={fetchComments} className="lm-btn-primary py-2 px-3 text-sm">Search</button>
                      </div>
                    </div>

                    <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                      {loadingComments ? (
                        <div className="py-20 text-center text-muted">Loading comments queue...</div>
                      ) : comments.length === 0 ? (
                        <div className="py-20 text-center text-muted">No comments found matching query parameters.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[960px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                              <tr>
                                <th className="py-3 pr-4">User</th>
                                <th className="py-3 pr-4">Story & Chapter Context</th>
                                <th className="py-3 pr-4">Comment Body</th>
                                <th className="py-3 pr-4">Report Count</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4 text-right">Moderator Controls</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {comments.map((comment) => {
                                const isReported = comment.reports && comment.reports.length > 0;
                                return (
                                  <tr key={comment.id} className="align-top hover:bg-surface-soft/40 transition">
                                    <td className="py-4 pr-4">
                                      <strong className="block text-ink">{comment.user.displayName || comment.user.username}</strong>
                                      <span className="text-xs text-muted font-mono">{comment.user.email}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <strong className="block text-ink truncate max-w-[180px]">{comment.story.title}</strong>
                                      {comment.chapter ? (
                                        <span className="text-xs text-muted block truncate max-w-[180px]">Ch {comment.chapter.number}: {comment.chapter.title}</span>
                                      ) : (
                                        <span className="text-xs text-muted block">Story Review</span>
                                      )}
                                    </td>
                                    <td className="py-4 pr-4 max-w-sm">
                                      <p className="text-ink leading-relaxed whitespace-pre-wrap">{comment.body}</p>
                                      <span className="block text-[10px] text-muted mt-1">ID: {comment.id}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                      {isReported ? (
                                        <div>
                                          <span className="text-danger font-bold text-xs">{comment.reports.length} Reports</span>
                                          <div className="mt-1 space-y-0.5">
                                            {comment.reports.slice(0, 3).map((r: any, idx: number) => (
                                              <span key={idx} className="block text-[9px] text-muted truncate max-w-[140px]">
                                                @{r.user.username}: "{r.reason}"
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-muted text-xs">0 Flags</span>
                                      )}
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${comment.hidden ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                                        }`}>
                                        {comment.hidden ? "hidden" : "visible"}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4 text-right">
                                      <div className="flex justify-end gap-1.5">
                                        {!comment.hidden ? (
                                          <button
                                            onClick={() => handleCommentAction(comment.id, "hide")}
                                            className="px-2 py-1 text-xs font-semibold text-warning border border-warning/30 bg-warning/5 rounded-lg hover:bg-warning/10"
                                          >
                                            Hide
                                          </button>
                                        ) : (
                                          <button
                                            onClick={() => handleCommentAction(comment.id, "restore")}
                                            className="px-2 py-1 text-xs font-semibold text-success border border-success/30 bg-success/5 rounded-lg hover:bg-success/10"
                                          >
                                            Restore
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => handleDeleteComment(comment.id, e)}
                                          className="rounded-lg border border-danger/30 bg-danger/10 p-1.5 text-danger transition hover:bg-danger/25"
                                          title="Permanently Delete Comment"
                                        >
                                          <Trash className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab Panel 2: Email Queue outbox */}
                {modSubTab === "emails" && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-surface border border-border p-6 rounded-xl relative z-20">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">System Email Queue</h2>
                        <p className="text-sm text-muted">Audit system messages, verification tokens outbox, and password-reset queues.</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Recipient email address..."
                          value={emailSearch}
                          onChange={(e) => setEmailSearch(e.target.value)}
                          className="lm-input max-w-xs text-sm"
                        />
                        <CustomSelect
                          value={emailStatusFilter}
                          onChange={setEmailStatusFilter}
                          options={[
                            { value: "", label: "All Statuses" },
                            { value: "PENDING", label: "Pending" },
                            { value: "SENT", label: "Sent" },
                            { value: "FAILED", label: "Failed" }
                          ]}
                          size="sm"
                          className="w-40"
                          triggerClassName="bg-surface border-border hover:border-accent text-xs h-10 w-[160px]"
                        />
                        <button onClick={fetchEmails} className="lm-btn-primary py-2 px-3 text-sm">Search</button>
                      </div>
                    </div>

                    <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                      {loadingEmails ? (
                        <div className="py-20 text-center text-muted">Loading email delivery outbox...</div>
                      ) : emails.length === 0 ? (
                        <div className="py-20 text-center text-muted">No emails queued or logged.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[960px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                              <tr>
                                <th className="py-3 pr-4">Recipient</th>
                                <th className="py-3 pr-4">Mail Subject</th>
                                <th className="py-3 pr-4">Message Excerpt</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">Attempts</th>
                                <th className="py-3 pr-4">Error details</th>
                                <th className="py-3 pr-4">Queued date</th>
                                <th className="py-3 pr-4">Sent date</th>
                                <th className="py-3 pr-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {emails.map((email) => {
                                const isFailed = email.status === "FAILED";
                                return (
                                  <tr key={email.id} className="align-middle hover:bg-surface-soft/40 transition">
                                    <td className="py-4 pr-4 font-semibold text-ink truncate max-w-[160px]">{email.email}</td>
                                    <td className="py-4 pr-4 text-ink truncate max-w-[160px]">{email.subject}</td>
                                    <td className="py-4 pr-4 text-muted text-xs truncate max-w-[200px]" title={email.bodyExcerpt}>{email.bodyExcerpt}</td>
                                    <td className="py-4 pr-4">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${email.status === "SENT" ? "bg-success/15 text-success" :
                                        email.status === "PENDING" ? "bg-warning/15 text-warning" : "bg-danger/10 text-danger"
                                        }`}>
                                        {email.status}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4 font-mono text-center">{email.attempts}</td>
                                    <td className="py-4 pr-4 text-xs text-danger truncate max-w-[140px]" title={email.error}>{email.error}</td>
                                    <td className="py-4 pr-4 text-xs text-muted">{email.date}</td>
                                    <td className="py-4 pr-4 text-xs text-muted">{email.sentAt}</td>
                                    <td className="py-4 pr-4 text-right">
                                      {isFailed && (
                                        <button
                                          onClick={() => handleResendEmail(email.id)}
                                          className="lm-btn-secondary px-2.5 py-1 text-xs font-semibold inline-flex items-center gap-1"
                                          title="Resend email message outbox"
                                        >
                                          <RefreshCw className="h-3 w-3" /> Resend
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab Panel 3: Phone verification OTP logs */}
                {modSubTab === "phone" && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-surface border border-border p-6 rounded-xl">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">Phone OTP Verification Logs</h2>
                        <p className="text-sm text-muted">Monitor OTP delivery status, detect failed attempts, and review OTP abuse alerts.</p>
                      </div>
                      <button onClick={fetchPhoneVerifications} className="lm-btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh List
                      </button>
                    </div>

                    <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                      {loadingPhone ? (
                        <div className="py-20 text-center text-muted">Loading SMS OTP verifications...</div>
                      ) : phoneVerifications.length === 0 ? (
                        <div className="py-20 text-center text-muted">No phone OTP records logged.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                              <tr>
                                <th className="py-3 pr-4">Phone Number</th>
                                <th className="py-3 pr-4">User Association</th>
                                <th className="py-3 pr-4 font-mono">Failed Attempts</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">OTP Abuse Indicators</th>
                                <th className="py-3 pr-4">Created date</th>
                                <th className="py-3 pr-4">Expires date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {phoneVerifications.map((v) => (
                                <tr key={v.id} className="align-middle hover:bg-surface-soft/40 transition">
                                  <td className="py-4 pr-4 font-semibold text-ink font-mono">{v.phoneNumber}</td>
                                  <td className="py-4 pr-4">
                                    {v.userId ? (
                                      <button onClick={() => viewUserDetails(v.userId)} className="text-accent hover:underline font-bold text-left">
                                        {v.user}
                                      </button>
                                    ) : (
                                      <span className="text-muted">Anonymous</span>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 font-mono text-center">{v.attempts}</td>
                                  <td className="py-4 pr-4">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.verified ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
                                      }`}>
                                      {v.verified ? "Verified" : "Unverified"}
                                    </span>
                                  </td>
                                  <td className="py-4 pr-4">
                                    {v.isAbusive ? (
                                      <span className="px-2 py-0.5 rounded bg-danger/10 text-danger font-bold text-[10px] inline-flex items-center gap-1">
                                        <AlertOctagon className="h-3 w-3" /> OTP ABUSE WARNING
                                      </span>
                                    ) : (
                                      <span className="text-muted text-xs">Safe</span>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4 text-xs text-muted">{v.createdAt}</td>
                                  <td className="py-4 pr-4 text-xs text-muted">{new Date(v.expiresAt).toLocaleTimeString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab Panel 4: Reader Feedback & Notes */}
                {modSubTab === "feedback" && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between bg-surface border border-border p-6 rounded-xl relative z-20">
                      <div>
                        <h2 className="font-display text-2xl font-semibold text-ink">Reader Feedback & Notes</h2>
                        <p className="text-sm text-muted">Manage the dynamic Writer's Note on the home page and view rating feedback submitted by users.</p>
                      </div>
                      <button onClick={() => { fetchFeedbacks(); fetchWriterNote(); }} className="lm-btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" /> Refresh Data
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Writer Note Card */}
                      <div className="lg:col-span-1 lm-card bg-surface p-6 border border-border rounded-xl flex flex-col justify-between h-fit gap-4">
                        <div>
                          <h3 className="font-display text-lg font-semibold text-ink mb-2">Update Writer's Note</h3>
                          <p className="text-xs text-muted mb-4">This note displays dynamically in the left contact column on the home page. You can write details about your current work, contact info, or a general quote.</p>
                          <textarea
                            value={writerNote}
                            onChange={(e) => setWriterNote(e.target.value)}
                            placeholder="Write your custom note here... Use line breaks for formatting."
                            maxLength={1000}
                            rows={8}
                            className="w-full p-3 rounded-lg border border-border bg-paper text-ink text-sm focus:outline-none focus:border-accent resize-none leading-relaxed"
                          />
                          <div className="flex justify-between items-center mt-2 text-xs text-muted">
                            <span>Spacing and line breaks are preserved</span>
                            <span className={writerNote.length >= 900 ? "text-danger font-bold" : ""}>
                              {writerNote.length}/1000 chars
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <h4 className="font-display text-sm font-semibold text-ink border-t border-border pt-3">Social Media Accounts</h4>
                            <div className="space-y-2">
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1">Twitter / X Link</label>
                                <input
                                  type="url"
                                  value={writerTwitter}
                                  onChange={(e) => setWriterTwitter(e.target.value)}
                                  placeholder="https://twitter.com/username"
                                  className="w-full p-2 rounded-lg border border-border bg-paper text-ink text-xs focus:outline-none focus:border-accent"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1">Instagram Link</label>
                                <input
                                  type="url"
                                  value={writerInstagram}
                                  onChange={(e) => setWriterInstagram(e.target.value)}
                                  placeholder="https://instagram.com/username"
                                  className="w-full p-2 rounded-lg border border-border bg-paper text-ink text-xs focus:outline-none focus:border-accent"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1">Facebook Link</label>
                                <input
                                  type="url"
                                  value={writerFacebook}
                                  onChange={(e) => setWriterFacebook(e.target.value)}
                                  placeholder="https://facebook.com/username"
                                  className="w-full p-2 rounded-lg border border-border bg-paper text-ink text-xs focus:outline-none focus:border-accent"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1">YouTube Link</label>
                                <input
                                  type="url"
                                  value={writerYoutube}
                                  onChange={(e) => setWriterYoutube(e.target.value)}
                                  placeholder="https://youtube.com/c/channelname"
                                  className="w-full p-2 rounded-lg border border-border bg-paper text-ink text-xs focus:outline-none focus:border-accent"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] uppercase font-bold text-muted mb-1">LinkedIn Link</label>
                                <input
                                  type="url"
                                  value={writerLinkedin}
                                  onChange={(e) => setWriterLinkedin(e.target.value)}
                                  placeholder="https://linkedin.com/in/username"
                                  className="w-full p-2 rounded-lg border border-border bg-paper text-ink text-xs focus:outline-none focus:border-accent"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleSaveWriterNote}
                          disabled={isSavingNote}
                          className="w-full lm-btn-primary py-2 px-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5"
                        >
                          {isSavingNote ? "Saving Note..." : "Save Note"}
                        </button>
                      </div>

                      {/* Right: Feedback Log Table */}
                      <div className="lg:col-span-2 lm-card bg-surface p-6 border border-border rounded-xl">
                        <h3 className="font-display text-lg font-semibold text-ink mb-4">Reader Feedback Log</h3>
                        {loadingFeedbacks ? (
                          <div className="py-20 text-center text-muted">Loading feedbacks...</div>
                        ) : feedbacks.length === 0 ? (
                          <div className="py-20 text-center text-muted">No reader feedback logs available yet.</div>
                        ) : (
                          <div className="overflow-x-auto text-ink">
                            <table className="w-full text-left text-sm min-w-[600px]">
                              <thead className="text-xs uppercase tracking-wider text-muted border-b border-border">
                                <tr>
                                  <th className="py-3 pr-4">User</th>
                                  <th className="py-3 pr-4">Rating</th>
                                  <th className="py-3 pr-4">Comments</th>
                                  <th className="py-3 pr-4">Date</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {feedbacks.map((f) => (
                                  <tr key={f.id} className="align-top hover:bg-surface-soft/40 transition">
                                    <td className="py-4 pr-4">
                                      <strong className="block text-ink">{f.name || "Anonymous"}</strong>
                                      {f.email && <span className="text-xs text-muted block">{f.email}</span>}
                                    </td>
                                    <td className="py-4 pr-4">
                                      <div className="flex items-center gap-0.5 text-warning">
                                        {Array.from({ length: 5 }).map((_, idx) => (
                                          <svg
                                            key={idx}
                                            className={`h-4 w-4 ${idx < f.rating ? "fill-warning text-warning" : "fill-none text-muted-soft"}`}
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          >
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                          </svg>
                                        ))}
                                        <span className="ml-1.5 text-xs font-semibold text-ink">({f.rating}/5)</span>
                                      </div>
                                    </td>
                                    <td className="py-4 pr-4 max-w-xs md:max-w-sm">
                                      <p className="leading-relaxed whitespace-pre-wrap">{f.comment || <em className="text-muted">No comment provided</em>}</p>
                                    </td>
                                    <td className="py-4 pr-4 text-xs text-muted whitespace-nowrap">
                                      {new Date(f.createdAt).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* TAB 6: SECURITY */}
            {activeTab === "security" && (
              <section className="lm-card bg-surface p-6 border border-border rounded-xl space-y-6">
                <div className="flex flex-col gap-4 md:items-left md:justify-between bg-surface border border-border p-6 rounded-xl">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
                      <ShieldAlert className="h-6 w-6 text-danger" />
                      Security & Anti-Abuse Center
                    </h2>
                    <p className="text-sm text-muted">Expose failed logins, active piracy risk warnings, and rate-limit violations.</p>
                  </div>
                  <div className="flex flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Search security alerts..."
                      value={securitySearch}
                      onChange={(e) => setSecuritySearch(e.target.value)}
                      className="lm-input max-w-xs text-sm"
                    />
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="lm-input text-sm"
                    >
                      <option value="">All Severities</option>
                      <option value="LOW">Low Severity</option>
                      <option value="MEDIUM">Medium Severity</option>
                      <option value="HIGH">High Severity</option>
                      <option value="CRITICAL">Critical Severity</option>
                    </select>
                    <button onClick={fetchSecurityActivities} className="lm-btn-primary py-2 px-3 text-sm flex items-center gap-1.5">
                      <Search className="h-4 w-4" /> Search
                    </button>
                    <button onClick={fetchSecurityActivities} className="text-sm" title="Refresh">
                      <RefreshCw className={`h-8 w-8 ${loadingSecurity ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="lm-card bg-surface/50 border border-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between text-xl">
                      <span className="text-muted font-medium">Total Alerts</span>
                      <span className="font-bold text-ink">{securityActivities.length}</span>
                    </div>

                    <span className="text-[10px] text-muted mt-1">Active items in view</span>
                  </div>
                  <div className="lm-card bg-surface/50 border border-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between text-xl">
                      <span className="text-danger font-medium flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                        Critical Incidents
                      </span>
                      <span className="font-bold text-danger">
                        {securityActivities.filter(a => a.severity === "CRITICAL").length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted mt-1">Requires immediate attention</span>
                  </div>
                  <div className="lm-card bg-surface/50 border border-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between text-xl">
                      <span className="text-warning font-medium">High Severity</span>
                      <span className="font-bold text-warning">
                        {securityActivities.filter(a => a.severity === "HIGH").length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted mt-1">Suspicious accounts/devices</span>
                  </div>
                  <div className="lm-card bg-surface/50 border border-border rounded-xl p-4 flex flex-col justify-between">
                    <div className="flex justify-between text-xl">
                      <span className="text-accent font-medium">Medium & Low</span>
                      <span className="font-bold text-accent">
                        {securityActivities.filter(a => a.severity === "MEDIUM" || a.severity === "LOW").length}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted mt-1">Rate limits & routine logs</span>
                  </div>
                </div>

                <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                  {loadingSecurity ? (
                    <div className="py-20 text-center text-muted">Loading security logs...</div>
                  ) : securityActivities.length === 0 ? (
                    <div className="py-20 text-center text-muted">No security incidents detected or matching criteria.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[960px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                            <th className="pb-3 pr-4">Severity</th>
                            <th className="pb-3 pr-4">Event Type</th>
                            <th className="pb-3 pr-4">Incident Detail</th>
                            <th className="pb-3 pr-4">Target User</th>
                            <th className="pb-3 pr-4">IP Address / Client</th>
                            <th className="pb-3 pr-4">Timestamp</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                          {securityActivities.map((act) => {
                            const isExpanded = expandedSecurityId === act.id;
                            let severityBadge = "bg-muted/15 text-muted";
                            if (act.severity === "CRITICAL") severityBadge = "bg-danger/20 text-danger border border-danger/30 shadow-sm shadow-danger/10 animate-pulse";
                            else if (act.severity === "HIGH") severityBadge = "bg-warning/15 text-warning border border-warning/30";
                            else if (act.severity === "MEDIUM") severityBadge = "bg-accent/15 text-accent border border-accent/25";
                            else if (act.severity === "LOW") severityBadge = "bg-success/15 text-success";

                            const metadataIp = act.metadata?.ip || "Unknown IP";
                            const metadataUserAgent = act.metadata?.userAgent || "Unknown Client";

                            return (
                              <Fragment key={act.id}>
                                <tr className="hover:bg-muted/5 transition-colors">
                                  <td className="py-4 pr-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${severityBadge}`}>
                                      {act.severity}
                                    </span>
                                  </td>
                                  <td className="py-4 pr-4 font-mono text-xs font-bold text-ink">
                                    {act.eventType}
                                  </td>
                                  <td className="py-4 pr-4 text-soft-ink max-w-xs truncate" title={act.detail}>
                                    {act.detail}
                                  </td>
                                  <td className="py-4 pr-4">
                                    {act.user ? (
                                      <button
                                        onClick={() => viewUserDetails(act.user.id)}
                                        className="text-accent hover:underline font-bold text-left block"
                                      >
                                        {act.user.displayName || act.user.username || act.user.email}
                                      </button>
                                    ) : (
                                      <span className="text-muted italic">System / Anonymous</span>
                                    )}
                                  </td>
                                  <td className="py-4 pr-4">
                                    <div className="text-xs text-soft-ink font-mono">{metadataIp}</div>
                                    <div className="text-[10px] text-muted truncate max-w-[150px]">{metadataUserAgent}</div>
                                  </td>
                                  <td className="py-4 pr-4 text-xs text-muted">
                                    {new Date(act.createdAt).toLocaleString()}
                                  </td>
                                  <td className="py-4 text-right space-x-2">
                                    <button
                                      onClick={() => setExpandedSecurityId(isExpanded ? null : act.id)}
                                      className="lm-btn-secondary px-2.5 py-1 text-xs"
                                    >
                                      {isExpanded ? "Hide Detail" : "Inspect"}
                                    </button>
                                    <button
                                      onClick={() => handleResolveActivity(act.id)}
                                      className="lm-btn-success px-2.5 py-1 text-xs"
                                    >
                                      Resolve
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr>
                                    <td colSpan={7} className="bg-muted/10 p-4 border-t border-b border-border/50">
                                      <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-muted uppercase tracking-wider">Extended Incident Metadata</h4>
                                        <pre className="text-xs bg-surface p-4 border border-border rounded-lg overflow-x-auto text-soft-ink font-mono max-h-[300px]">
                                          {JSON.stringify(act.metadata || {}, null, 2)}
                                        </pre>
                                        {act.user && (
                                          <div className="flex gap-4 items-center pt-2">
                                            <span className="text-xs text-muted">User ID: <span className="font-mono text-soft-ink">{act.user.id}</span></span>
                                            <span className="text-xs text-muted">User Role: <span className="font-semibold text-soft-ink uppercase">{act.user.role}</span></span>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 7: AUDIT */}
            {activeTab === "audit" && (
              <section className="lm-card bg-surface p-6 border border-border rounded-xl space-y-6">
                <div className="flex flex-col gap-4 md:items-left md:justify-between bg-surface border border-border p-6 rounded-xl">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink flex items-center gap-2">
                      <History className="h-6 w-6 text-accent" />
                      Immutable Audit Trail
                    </h2>
                    <p className="text-sm text-muted">Cryptographically safe audit log viewer for all administrator actions.</p>
                  </div>
                  <div className="flex flex-row gap-4">
                    <input
                      type="text"
                      placeholder="Search action, target or admin..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="lm-input max-w-xs text-sm"
                    />
                    <select
                      value={auditActionFilter}
                      onChange={(e) => setAuditActionFilter(e.target.value)}
                      className="lm-input text-sm"
                    >
                      <option value="">All Actions</option>
                      <option value="STORY_PUBLISH">Story Publish</option>
                      <option value="STORY_DELETE">Story Delete</option>
                      <option value="WALLET_ADJUST">Wallet Adjust</option>
                      <option value="USER_SUSPEND">User Suspend</option>
                      <option value="BAN_USER">Ban User</option>
                      <option value="CHAPTER_CREATE">Chapter Create</option>
                      <option value="PAYMENT_REFUND_APPROVE">Refund Approve</option>
                      <option value="EMAIL_RESEND">Email Resend</option>
                    </select>
                    <button onClick={() => fetchAuditLogs(1)} className="lm-btn-primary py-2 px-3 text-sm flex items-center gap-1.5">
                      <Search className="h-4 w-4" /> Search
                    </button>
                    <button onClick={() => fetchAuditLogs(1)} className="text-sm" title="Refresh">
                      <RefreshCw className={`h-8 w-8 ${loadingAudit ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                  {loadingAudit ? (
                    <div className="py-20 text-center text-muted">Loading audit logs trail...</div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-20 text-center text-muted">No audit logs found.</div>
                  ) : (
                    <div className="space-y-6">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[960px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                              <th className="pb-3 pr-4">Timestamp</th>
                              <th className="pb-3 pr-4">Administrator</th>
                              <th className="pb-3 pr-4">Action Type</th>
                              <th className="pb-3 pr-4">Target Resource</th>
                              <th className="pb-3 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {auditLogs.map((log) => {
                              const isExpanded = expandedAuditId === log.id;
                              let actionColor = "bg-muted/15 text-muted";
                              if (log.action.includes("DELETE") || log.action.includes("BAN") || log.action.includes("SUSPEND")) {
                                actionColor = "bg-danger/10 text-danger border border-danger/20";
                              } else if (log.action.includes("CREATE") || log.action.includes("PUBLISH")) {
                                actionColor = "bg-success/10 text-success border border-success/20";
                              } else if (log.action.includes("ADJUST") || log.action.includes("REFUND")) {
                                actionColor = "bg-accent/10 text-accent border border-accent/20";
                              }

                              return (
                                <Fragment key={log.id}>
                                  <tr className="hover:bg-muted/5 transition-colors">
                                    <td className="py-4 pr-4 text-xs text-muted font-mono">
                                      {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-4 pr-4">
                                      <div className="font-semibold text-ink">{log.admin?.displayName || "System Administrator"}</div>
                                      <div className="text-xs text-muted font-mono">{log.admin?.email}</div>
                                    </td>
                                    <td className="py-4 pr-4">
                                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${actionColor}`}>
                                        {log.action}
                                      </span>
                                    </td>
                                    <td className="py-4 pr-4 font-medium text-soft-ink">
                                      {log.target}
                                    </td>
                                    <td className="py-4 text-right">
                                      <button
                                        onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                                        className="lm-btn-secondary px-2.5 py-1 text-xs inline-flex items-center gap-1"
                                      >
                                        {isExpanded ? "Hide Metadata" : "View Metadata"}
                                      </button>
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr>
                                      <td colSpan={5} className="bg-muted/10 p-4 border-t border-b border-border/50">
                                        <div>
                                          <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Log Parameters & Context</h4>
                                          <pre className="text-xs bg-surface p-4 border border-border rounded-lg overflow-x-auto text-soft-ink font-mono max-h-[300px]">
                                            {JSON.stringify(log.metadata || {}, null, 2)}
                                          </pre>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Bar */}
                      {auditTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-border/50 pt-4">
                          <span className="text-xs text-muted">
                            Page <span className="font-semibold text-soft-ink">{auditPage}</span> of <span className="font-semibold text-soft-ink">{auditTotalPages}</span>
                          </span>
                          <div className="flex gap-2">
                            <button
                              disabled={auditPage === 1}
                              onClick={() => fetchAuditLogs(auditPage - 1)}
                              className="lm-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              disabled={auditPage === auditTotalPages}
                              onClick={() => fetchAuditLogs(auditPage + 1)}
                              className="lm-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB 8: MONETIZATION */}
            {activeTab === "monetization" && (
              <section className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="font-display text-4xl font-semibold text-ink">Monetization & Packages Manager</h1>
                  {/* Monetization Sub-tabs Switcher */}
                  <div className="flex border-b border-border bg-surface-soft/20 max-w-[680px] rounded-xl py-1 px-2 gap-4 my-4">
                    <button
                      onClick={() => setMonetizationSubTab("coins")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg max-w-[300px] transition-all ${monetizationSubTab === "coins"
                        ? "bg-accent text-paper shadow-sm"
                        : "text-muted hover:text-ink hover:bg-muted/5"
                        }`}
                    >
                      Coin-based Management (कॉइन आधारित)
                    </button>

                    <button
                      onClick={() => setMonetizationSubTab("subscriptions")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg max-w-[350px] transition-all ${monetizationSubTab === "subscriptions"
                        ? "bg-accent text-paper shadow-sm"
                        : "text-muted hover:text-ink hover:bg-muted/5"
                        }`}
                    >
                      Subscription-based Management (सदस्यता आधारित)
                    </button>
                  </div>
                </div>

                {monetizationSubTab === "coins" && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Top Panel: Coin Packages Catalog (Full Width) */}
                      <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h3 className="font-display text-xl font-semibold text-ink">Coin Packages Catalog</h3>
                            <p className="text-xs text-muted mt-0.5">Manage and audit database-backed pricing products.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPackageId(null);
                              setPackageName("");
                              setPackageCoins(0);
                              setPackageBonus(0);
                              setPackagePrice(0);
                              setPackageCampaign("");
                              setPackageManualDiscount(0);
                              setPackageCombinedDiscount(0);
                              setPackageActive(true);
                              setIsPackageModalOpen(true);
                            }}
                            className="lm-btn-primary h-10 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
                          >
                            <Plus className="h-4 w-4" /> Create Coin Package
                          </button>
                        </div>
                        {loadingMonetization ? (
                          <div className="py-20 text-center text-muted">Loading package ledger...</div>
                        ) : localPackages.length === 0 ? (
                          <div className="py-20 text-center text-muted">No coin packages found in the database.</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-left text-sm">
                              <thead>
                                <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                                  <th className="pb-3 pr-4">Package Name</th>
                                  <th className="pb-3 pr-4">Regular Coins</th>
                                  <th className="pb-3 pr-4">Bonus Coins</th>
                                  <th className="pb-3 pr-4">Price (INR)</th>
                                  <th className="pb-3 pr-4">Campaign (Discounts)</th>
                                  <th className="pb-3 pr-4">Status</th>
                                  <th className="pb-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/50">
                                {localPackages.map((pack) => {
                                  const isSub = pack.name.toLowerCase().includes("subscription") ||
                                    pack.name.toLowerCase().includes("membership") ||
                                    (pack.campaign || "").toLowerCase().includes("subscription");
                                  const parts = (pack.campaign || "").split("|");
                                  const campName = parts[0] || "None";
                                  const manual = Number(parts[1]) || 0;
                                  const combined = Number(parts[2]) || 0;
                                  const scheduled = activeScheduledDiscountPercent;
                                  const totalDiscount = manual + combined + scheduled;
                                  const basePrice = pack.priceCents / 100;
                                  const discountedPrice = Math.max(0, Math.round(basePrice * (1 - totalDiscount / 100)));

                                  return (
                                    <tr key={pack.id} className="hover:bg-muted/5 transition-colors">
                                      <td className="py-4 pr-4">
                                        <div className="font-semibold text-ink flex items-center gap-2">
                                          {pack.name}
                                          {isSub && (
                                            <span className="text-[10px] uppercase font-bold text-accent border border-accent/30 px-1.5 py-0.5 rounded bg-accent-soft">
                                              Recurring Pass
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted font-mono">{pack.id}</div>
                                      </td>
                                      <td className="py-4 pr-4 font-semibold text-ink">{formatNumber(pack.coins)}</td>
                                      <td className="py-4 pr-4 text-soft-ink font-semibold">+{formatNumber(pack.bonusCoins || 0)} bonus</td>
                                      <td className="py-4 pr-4 font-semibold">
                                        {totalDiscount > 0 ? (
                                          <div className="text-sm">
                                            <span className="text-accent font-bold">Rs. {formatNumber(discountedPrice)}</span>
                                            <span className="text-[10px] text-muted line-through ml-1.5 font-normal font-mono">Rs. {formatNumber(basePrice)}</span>
                                          </div>
                                        ) : (
                                          <span className="text-accent font-bold">Rs. {formatNumber(basePrice)}</span>
                                        )}
                                      </td>
                                      <td className="py-4 pr-4">
                                        <div className="text-xs">
                                          <div className="font-semibold text-soft-ink">{campName}</div>
                                          <div className="text-[10px] text-muted mt-0.5 space-x-1.5">
                                            <span>Manual: <span className="text-accent font-semibold">{manual}%</span></span>
                                            <span>Combined: <span className="text-accent font-semibold">{combined}%</span></span>
                                            {scheduled > 0 && <span className="text-success font-semibold">+{scheduled}% Campaign</span>}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="py-4 pr-4">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pack.active !== false ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
                                          }`}>
                                          {pack.active !== false ? "ACTIVE" : "INACTIVE"}
                                        </span>
                                      </td>
                                      <td className="py-4 text-right space-x-2">
                                        <button
                                          onClick={() => handleEditPackage(pack)}
                                          className="lm-btn-secondary px-2.5 py-1 text-xs font-semibold"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={(e) => handleDeletePackage(pack.id, e)}
                                          className="px-2.5 py-1 text-xs font-semibold text-danger border border-danger/30 bg-danger/5 rounded-lg hover:bg-danger/10"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Bottom Panel: Scheduled Discounts & Campaign Details Grid */}
                      <div className="grid gap-6 md:grid-cols-2 items-stretch w-full">
                        {/* 2. Schedule Discount Campaign */}
                        <div className="lm-card bg-surface p-6 border border-border rounded-xl flex flex-col h-full">
                          <h3 className="font-display text-lg font-semibold text-ink mb-1 flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-accent" />
                            Schedule Coin Discounts
                          </h3>
                          <p className="text-[10px] text-muted mb-6">Set an additional discount rate, title, description, and period applied automatically.</p>

                          <div className="flex flex-col flex-grow">
                            <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-paper/40 p-1">
                              <button
                                type="button"
                                onClick={() => setScheduleDiscountMode("one-time")}
                                className={`flex min-h-14 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${scheduleDiscountMode === "one-time" ? "bg-accent text-paper shadow-sm" : "text-muted hover:bg-surface hover:text-ink"}`}
                              >
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 text-left leading-tight">
                                  One-Time Period
                                  <span className={`block text-[10px] font-semibold ${scheduleDiscountMode === "one-time" ? "text-paper/80" : "text-muted"}`}>Date range schedule</span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setScheduleDiscountMode("specific-day")}
                                className={`flex min-h-14 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${scheduleDiscountMode === "specific-day" ? "bg-accent text-paper shadow-sm" : "text-muted hover:bg-surface hover:text-ink"}`}
                              >
                                <Clock className="h-4 w-4 shrink-0" />
                                <span className="min-w-0 text-left leading-tight">
                                  Specific Day Time
                                  <span className={`block text-[10px] font-semibold ${scheduleDiscountMode === "specific-day" ? "text-paper/80" : "text-muted"}`}>Weekly or monthly</span>
                                </span>
                              </button>
                            </div>

                            {scheduleDiscountMode === "one-time" ? (
                              <form onSubmit={handleSaveScheduledDiscount} className="flex flex-col justify-between flex-grow space-y-4">
                                {editingScheduledDiscountId && (
                                  <div className="mb-4 flex flex-col gap-2 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent sm:flex-row sm:items-center sm:justify-between">
                                    <span>Editing upcoming one-time discount</span>
                                    <button
                                      type="button"
                                      onClick={resetScheduledDiscountForm}
                                      className="w-fit rounded-md border border-accent/30 bg-surface px-2 py-1 text-[11px] font-bold text-accent hover:bg-accent-soft"
                                    >
                                      New Discount
                                    </button>
                                  </div>
                                )}
                                <div className="space-y-5">
                                  <div className="rounded-xl border border-border/70 bg-paper/40 p-3.5">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                                        <Clock className="h-3.5 w-3.5 text-accent" />
                                        Quick Period
                                      </div>
                                      <span className="w-fit rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                                        Future only
                                      </span>
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                      {DISCOUNT_PERIOD_PRESETS.map((preset) => (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={() => handleApplySchedulePreset(preset.startOffsetMinutes, preset.durationMinutes)}
                                          className="h-9 rounded-lg border border-border bg-surface px-2 text-[11px] font-semibold text-soft-ink transition hover:border-accent hover:bg-accent-soft hover:text-ink"
                                        >
                                          {preset.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-paper/30 px-3 py-2">
                                    <div>
                                      <div className="text-xs font-bold text-ink">Enable when saved</div>
                                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">Panel toggle can change this later</div>
                                    </div>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                      <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={scheduledDiscountEnabled}
                                        onChange={(e) => setScheduledDiscountEnabled(e.target.checked)}
                                      />
                                      <span className="h-6 w-11 rounded-full bg-muted/30 transition peer-checked:bg-success/70 peer-focus:ring-2 peer-focus:ring-accent/30" />
                                      <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-surface shadow transition peer-checked:translate-x-5" />
                                    </label>
                                  </div>

                                  <div className="grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)_minmax(0,1fr)]">
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                                        Discount (%)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="90"
                                        step="1"
                                        value={scheduledDiscountPercent}
                                        onChange={(e) => setScheduledDiscountPercent(Number(e.target.value))}
                                        className="lm-input text-sm w-full h-11 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                        required
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                                        Start Date & Time
                                      </label>
                                      <div className="relative">
                                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                        <input
                                          type="datetime-local"
                                          min={scheduleMinDateTime}
                                          value={scheduledDiscountStart}
                                          onChange={(e) => handleScheduledDiscountStartChange(e.target.value)}
                                          className="lm-input text-sm w-full h-11 rounded-lg bg-surface border border-border py-2 pl-9 pr-3 focus:border-accent outline-none font-mono"
                                          required={scheduledDiscountEnabled}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                                        End Date & Time
                                      </label>
                                      <div className="relative">
                                        <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                        <input
                                          type="datetime-local"
                                          min={scheduleEndMinDateTime}
                                          value={scheduledDiscountEnd}
                                          onChange={(e) => handleScheduledDiscountEndChange(e.target.value)}
                                          className="lm-input text-sm w-full h-11 rounded-lg bg-surface border border-border py-2 pl-9 pr-3 focus:border-accent outline-none font-mono"
                                          required={scheduledDiscountEnabled}
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {scheduledDiscountValidationMessage && (
                                    <div className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
                                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                      <span>{scheduledDiscountValidationMessage}</span>
                                    </div>
                                  )}

                                  <div className="space-y-4">
                                    <div>
                                      <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                                          Discount Campaign Title
                                        </label>
                                        <span className="text-[10px] font-semibold text-muted">{scheduledDiscountTitle.length}/80</span>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="e.g. Special Weekend Sale"
                                        value={scheduledDiscountTitle}
                                        maxLength={80}
                                        onChange={(e) => setScheduledDiscountTitle(e.target.value)}
                                        className="lm-input text-sm w-full h-11 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                                      />
                                    </div>

                                    <div>
                                      <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                                          Discount Campaign Description
                                        </label>
                                        <span className="text-[10px] font-semibold text-muted">{scheduledDiscountDescription.length}/180</span>
                                      </div>
                                      <textarea
                                        placeholder="e.g. Get 20% off on all packages this weekend!"
                                        value={scheduledDiscountDescription}
                                        maxLength={180}
                                        rows={4}
                                        onChange={(e) => setScheduledDiscountDescription(e.target.value)}
                                        className="lm-input text-sm w-full min-h-[96px] resize-y rounded-lg bg-surface border border-border px-3 py-2.5 leading-relaxed focus:border-accent outline-none"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-border/60">
                                  <button
                                    type="submit"
                                    disabled={savingScheduledDiscount || Boolean(scheduledDiscountValidationMessage)}
                                    className="w-full inline-flex items-center justify-center h-10 px-5 rounded-lg text-sm font-semibold transition bg-accent text-paper hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingScheduledDiscount ? "Saving..." : editingScheduledDiscountId ? "Update One-Time Schedule" : "Create One-Time Schedule"}
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="flex flex-col justify-between flex-grow space-y-4">
                                <div className="rounded-xl border border-border/70 bg-paper/30 p-4 space-y-4">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <h4 className="text-sm font-bold text-ink">Specific Day Discount</h4>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Weekly or monthly auto apply</p>
                                    </div>
                                    <label className="flex w-fit items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-bold text-soft-ink">
                                      <input
                                        type="checkbox"
                                        checked={recurringDiscountEnabled}
                                        onChange={(e) => setRecurringDiscountEnabled(e.target.checked)}
                                        className="h-3.5 w-3.5 rounded border-border text-accent focus:ring-accent"
                                      />
                                      Enabled when saved
                                    </label>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-2">
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Title</label>
                                      <input
                                        type="text"
                                        value={recurringDiscountTitle}
                                        maxLength={80}
                                        onChange={(e) => setRecurringDiscountTitle(e.target.value)}
                                        placeholder="e.g. Friday Coin Drop"
                                        className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Discount (%)</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="90"
                                        step="1"
                                        value={recurringDiscountPercent}
                                        onChange={(e) => setRecurringDiscountPercent(Number(e.target.value))}
                                        className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-mono outline-none focus:border-accent"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Repeat</label>
                                      <select
                                        value={recurringDiscountType}
                                        onChange={(e) => setRecurringDiscountType(e.target.value as RecurringDiscountType)}
                                        className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
                                      >
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                                        {recurringDiscountType === "weekly" ? "Weekday" : "Month Day"}
                                      </label>
                                      {recurringDiscountType === "weekly" ? (
                                        <select
                                          value={recurringDiscountDayOfWeek}
                                          onChange={(e) => setRecurringDiscountDayOfWeek(Number(e.target.value))}
                                          className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
                                        >
                                          {WEEKDAY_OPTIONS.map((day) => (
                                            <option key={day.value} value={day.value}>{day.label}</option>
                                          ))}
                                        </select>
                                      ) : (
                                        <select
                                          value={recurringDiscountDayOfMonth}
                                          onChange={(e) => setRecurringDiscountDayOfMonth(Number(e.target.value))}
                                          className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
                                        >
                                          {MONTH_DAY_OPTIONS.map((day) => (
                                            <option key={day} value={day}>{day}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Start</label>
                                        <input
                                          type="time"
                                          value={recurringDiscountStartTime}
                                          onChange={(e) => setRecurringDiscountStartTime(e.target.value)}
                                          className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm font-mono outline-none focus:border-accent"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">End</label>
                                        <input
                                          type="time"
                                          value={recurringDiscountEndTime}
                                          onChange={(e) => setRecurringDiscountEndTime(e.target.value)}
                                          className="lm-input h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm font-mono outline-none focus:border-accent"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <textarea
                                    value={recurringDiscountDescription}
                                    maxLength={180}
                                    rows={3}
                                    onChange={(e) => setRecurringDiscountDescription(e.target.value)}
                                    placeholder="Optional internal description"
                                    className="lm-input min-h-[76px] w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent"
                                  />
                                </div>

                                <div className="pt-4 border-t border-border/60">
                                  <button
                                    type="button"
                                    onClick={handleSaveRecurringDiscount}
                                    disabled={savingScheduledDiscount}
                                    className="w-full inline-flex h-10 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-paper transition hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {savingScheduledDiscount ? "Saving..." : "Create Specific-Day Schedule"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 3. Campaign Status Panels */}
                        <div className="lm-card bg-surface p-6 border border-border rounded-xl h-full">
                          <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-1.5">
                                <Tag className="h-4 w-4 text-accent" />
                                Discount Campaigns
                              </h3>
                              <p className="text-[9px] text-muted mt-0.5">One-time and specific-day campaign panels.</p>
                            </div>
                            {activeScheduledDiscount && (
                              <span className="w-fit rounded-lg border border-success/25 bg-success/10 px-2.5 py-1 text-xs font-black text-success">
                                -{activeScheduledDiscount.campaign.percent}% Live
                              </span>
                            )}
                          </div>

                          <div className="mt-5 space-y-5">
                            <section className="space-y-3">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">One-Time Period Discounts</h4>
                                <span className="text-[10px] font-semibold text-muted">{oneTimeDiscountPanels.length}/3</span>
                              </div>

                              {oneTimeDiscountPanels.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                  {oneTimeDiscountPanels.map(({ discount, status }) => {
                                    const meta = getOneTimeStatusMeta(status, discount.enabled);
                                    const isExpired = status === "expired";
                                    const canEdit = status === "upcoming";

                                    return (
                                      <div key={discount.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-paper/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="min-w-0 break-words text-sm font-bold text-ink">{discount.title || "Untitled Discount"}</span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.colorClass}`}>
                                              {meta.label}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-[11px] font-mono text-muted">
                                            {discount.start ? new Date(discount.start).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not set"}
                                            <span className="mx-1">to</span>
                                            {discount.end ? new Date(discount.end).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not set"}
                                          </div>
                                        </div>

                                        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                                          <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-black text-success">-{discount.percent}%</span>
                                          {canEdit && (
                                            <button
                                              type="button"
                                              onClick={() => handleEditScheduledDiscount(discount)}
                                              className="rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent hover:bg-accent-soft"
                                            >
                                              Edit
                                            </button>
                                          )}
                                          <label className="relative inline-flex cursor-pointer items-center">
                                            <input
                                              type="checkbox"
                                              className="peer sr-only"
                                              checked={discount.enabled}
                                              disabled={savingScheduledDiscount || (isExpired && !discount.enabled)}
                                              onChange={(e) => handleToggleOneTimeDiscount(discount.id, e.target.checked)}
                                            />
                                            <span className="h-6 w-11 rounded-full bg-muted/30 transition peer-checked:bg-success/70 peer-disabled:cursor-not-allowed peer-disabled:opacity-40" />
                                            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-surface shadow transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-border/70 bg-paper/20 p-4 text-center text-xs font-semibold text-muted">
                                  No discount added
                                </div>
                              )}
                            </section>

                            <section className="space-y-3 border-t border-border/60 pt-5">
                              <div className="flex items-center justify-between gap-3">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Multiple Period Discounts</h4>
                                <span className="text-[10px] font-semibold text-muted">{recurringDiscounts.length}</span>
                              </div>

                              {recurringDiscounts.length > 0 ? (
                                <div className="flex flex-col gap-3">
                                  {recurringDiscounts.map((discount) => {
                                    const isLive = activeScheduledDiscount?.kind === "recurring" && activeScheduledDiscount.campaign.id === discount.id;
                                    return (
                                      <div key={discount.id} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-paper/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="min-w-0 break-words text-sm font-bold text-ink">{discount.title || "Specific Day Discount"}</span>
                                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${isLive ? "bg-success/15 text-success border-success/30" : discount.enabled ? "bg-accent/15 text-accent border-accent/30" : "bg-muted/10 text-muted border-border/60"}`}>
                                              {isLive ? "Live" : discount.enabled ? "Enabled" : "Disabled"}
                                            </span>
                                          </div>
                                          <div className="mt-1 text-[11px] font-mono text-muted">{describeRecurringDiscount(discount)}</div>
                                        </div>
                                        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                                          <span className="rounded-lg bg-success/10 px-2 py-1 text-xs font-black text-success">-{discount.percent}%</span>
                                          <label className="relative inline-flex cursor-pointer items-center">
                                            <input
                                              type="checkbox"
                                              className="peer sr-only"
                                              checked={discount.enabled}
                                              disabled={savingScheduledDiscount}
                                              onChange={(e) => handleToggleRecurringDiscount(discount.id, e.target.checked)}
                                            />
                                            <span className="h-6 w-11 rounded-full bg-muted/30 transition peer-checked:bg-success/70 peer-disabled:cursor-not-allowed peer-disabled:opacity-40" />
                                            <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-surface shadow transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-border/70 bg-paper/20 p-4 text-center text-xs font-semibold text-muted">
                                  No discount added
                                </div>
                              )}
                            </section>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {monetizationSubTab === "subscriptions" && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {/* Subscription Stats */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: "Active Subscriptions", value: data.subscriptionStats.totalActive, color: "text-accent" },
                          { label: "Expired Subscriptions", value: data.subscriptionStats.totalExpired, color: "text-muted" },
                          { label: "Subscription Revenue", value: `Rs. ${formatNumber(data.subscriptionStats.totalRevenue)}`, color: "text-success" },
                          { label: "Conversion Rate", value: `${data.analytics.conversionRate.toFixed(1)}%`, color: "text-accent2" }
                        ].map((stat) => (
                          <div key={stat.label} className="lm-card p-4 border border-border rounded-xl bg-surface/50">
                            <span className="text-[10px] uppercase font-bold text-muted block">{stat.label}</span>
                            <span className={`text-2xl font-display font-bold ${stat.color} mt-1`}>{stat.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Previews of the Three subscription boxes */}
                      <div className="grid gap-6 md:grid-cols-3">
                        {/* Box 1: Weekly */}
                        {(() => {
                          const totalCoins = subCoinsPerDay * 7;
                          const price = weeklyBasePrice;
                          const perCoinCost = totalCoins > 0 ? (price / totalCoins).toFixed(2) : "0";
                          return (
                            <div className="lm-card bg-surface p-6 border border-border rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition group">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-accent/5 rounded-bl-full flex items-center justify-center">
                                <span className="text-xs font-bold text-accent">W</span>
                              </div>
                              <h4 className="font-display text-lg font-bold text-ink uppercase tracking-wide">Weekly Pass</h4>
                              <p className="text-xs text-muted mt-0.5">Recurring weekly membership</p>

                              <div className="mt-6 space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted block">Daily Credit</span>
                                  <span className="text-xl font-bold text-ink">{subCoinsPerDay} coins / day</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-b border-border/40 py-2.5">
                                  <div>
                                    <span className="text-[10px] text-muted block">Total Coins</span>
                                    <span className="text-sm font-semibold text-soft-ink">{totalCoins} coins</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted block">Cost / Coin</span>
                                    <span className="text-sm font-semibold text-soft-ink">Rs. {perCoinCost}</span>
                                  </div>
                                </div>

                                <div className="pt-2">
                                  <span className="text-[10px] uppercase font-bold text-muted block">Weekly Price</span>
                                  <span className="text-2xl font-display font-extrabold text-accent">Rs. {price}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Box 2: Monthly */}
                        {(() => {
                          const totalCoins = subCoinsPerDay * 30;

                          // Calculated Monthly price based on Base price and Monthly discount percentage
                          const basePrice = monthlyBasePrice;
                          const price = Math.round(basePrice * (1 - monthlyUpgradeDiscount / 100));
                          const perCoinCost = totalCoins > 0 ? (price / totalCoins).toFixed(2) : "0";

                          // Calculate discount compared to weekly cost-per-coin
                          const weeklyCost = (subCoinsPerDay * 7) > 0 ? (weeklyBasePrice / (subCoinsPerDay * 7)) : 0;
                          const monthlyCost = totalCoins > 0 ? (price / totalCoins) : 0;
                          const savings = weeklyCost > 0 ? Math.round(((weeklyCost - monthlyCost) / weeklyCost) * 100) : 0;

                          return (
                            <div className="lm-card bg-surface p-6 border border-accent/25 rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition group ring-2 ring-accent/15">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-accent/10 rounded-bl-full flex items-center justify-center">
                                <span className="text-xs font-bold text-accent">M</span>
                              </div>
                              {savings > 0 && (
                                <span className="absolute top-4 left-4 bg-success/15 text-success text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-success/30">
                                  Save {savings}% vs Weekly
                                </span>
                              )}
                              <h4 className="font-display text-lg font-bold text-ink uppercase tracking-wide mt-4">Monthly Pass</h4>
                              <p className="text-xs text-muted mt-0.5">Recurring monthly membership</p>

                              <div className="mt-6 space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted block">Daily Credit</span>
                                  <span className="text-xl font-bold text-ink">{subCoinsPerDay} coins / day</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-b border-border/40 py-2.5">
                                  <div>
                                    <span className="text-[10px] text-muted block">Total Coins</span>
                                    <span className="text-sm font-semibold text-soft-ink">{totalCoins} coins</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted block">Cost / Coin</span>
                                    <span className="text-sm font-semibold text-soft-ink">Rs. {perCoinCost}</span>
                                  </div>
                                </div>

                                <div className="pt-2">
                                  <span className="text-[10px] uppercase font-bold text-muted block text-decoration-line: line-through text-muted/60 text-xs">Base Price: Rs. {basePrice}</span>
                                  <span className="text-[10px] uppercase font-bold text-muted block mt-0.5">Monthly Price ({monthlyUpgradeDiscount}% off)</span>
                                  <span className="text-2xl font-display font-extrabold text-accent">Rs. {price}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Box 3: Yearly */}
                        {(() => {
                          const totalCoins = subCoinsPerDay * 365;

                          // Calculated Yearly price based on Base price and Yearly discount percentage
                          const basePrice = yearlyBasePrice;
                          const price = Math.round(basePrice * (1 - yearlyUpgradeDiscount / 100));
                          const perCoinCost = totalCoins > 0 ? (price / totalCoins).toFixed(2) : "0";

                          // Calculate discount compared to monthly cost-per-coin
                          const monthlyCost = (subCoinsPerDay * 30) > 0 ? (monthlyBasePrice * (1 - monthlyUpgradeDiscount / 100) / (subCoinsPerDay * 30)) : 0;
                          const yearlyCost = totalCoins > 0 ? (price / totalCoins) : 0;
                          const savings = monthlyCost > 0 ? Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100) : 0;

                          return (
                            <div className="lm-card bg-surface p-6 border border-border rounded-2xl relative overflow-hidden shadow-sm hover:shadow-md transition group">
                              <div className="absolute top-0 right-0 h-16 w-16 bg-accent/5 rounded-bl-full flex items-center justify-center">
                                <span className="text-xs font-bold text-accent">Y</span>
                              </div>
                              {savings > 0 && (
                                <span className="absolute top-4 left-4 bg-accent/15 text-accent text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-accent/30">
                                  Save {savings}% vs Monthly
                                </span>
                              )}
                              <h4 className="font-display text-lg font-bold text-ink uppercase tracking-wide mt-4">Yearly Pass</h4>
                              <p className="text-xs text-muted mt-0.5">Recurring yearly membership</p>

                              <div className="mt-6 space-y-3">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-muted block">Daily Credit</span>
                                  <span className="text-xl font-bold text-ink">{subCoinsPerDay} coins / day</span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 border-t border-b border-border/40 py-2.5">
                                  <div>
                                    <span className="text-[10px] text-muted block">Total Coins</span>
                                    <span className="text-sm font-semibold text-soft-ink">{totalCoins} coins</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-muted block">Cost / Coin</span>
                                    <span className="text-sm font-semibold text-soft-ink">Rs. {perCoinCost}</span>
                                  </div>
                                </div>

                                <div className="pt-2">
                                  <span className="text-[10px] uppercase font-bold text-muted block text-decoration-line: line-through text-muted/60 text-xs">Base Price: Rs. {basePrice}</span>
                                  <span className="text-[10px] uppercase font-bold text-muted block mt-0.5">Yearly Price ({yearlyUpgradeDiscount}% off)</span>
                                  <span className="text-2xl font-display font-extrabold text-accent">Rs. {price}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Subscription Rules Configurator Form */}
                      <div className="lm-card bg-surface p-6 border border-border rounded-xl">
                        <h3 className="font-display text-xl font-semibold text-ink mb-4">Subscription Pricing Rules Configurator</h3>
                        <form onSubmit={handleSaveSubSettings} className="space-y-6">
                          <div className="grid gap-6 md:grid-cols-3">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                                Daily Coins Allowance
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={subCoinsPerDay}
                                onChange={(e) => setSubCoinsPerDay(Number(e.target.value))}
                                className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                required
                              />
                              <p className="text-[10px] text-muted mt-1">Users receive this amount of coins every day during their pass duration.</p>
                            </div>

                            <div className="flex items-center gap-2 pt-6">
                              <input
                                type="checkbox"
                                id="subscriptionsEnabledCheckbox"
                                checked={subscriptionsEnabled}
                                onChange={(e) => setSubscriptionsEnabled(e.target.checked)}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                              />
                              <label htmlFor="subscriptionsEnabledCheckbox" className="text-xs font-semibold text-soft-ink cursor-pointer">
                                Mark Subscriptions Passes Active & Visible
                              </label>
                            </div>
                          </div>

                          <div className="border-t border-border/40 pt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-semibold text-ink">Base Price Settings (INR)</h4>
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                                  Weekly Base Price
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={weeklyBasePrice}
                                  onChange={(e) => setWeeklyBasePrice(Number(e.target.value))}
                                  className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                                  Monthly Base Price
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={monthlyBasePrice}
                                  onChange={(e) => setMonthlyBasePrice(Number(e.target.value))}
                                  className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                                  Yearly Base Price
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={yearlyBasePrice}
                                  onChange={(e) => setYearlyBasePrice(Number(e.target.value))}
                                  className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                  required
                                />
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-border/40 pt-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-semibold text-ink">Upgrade Discount Settings (%)</h4>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                                  Monthly Upgrade Discount (%)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="90"
                                  value={monthlyUpgradeDiscount}
                                  onChange={(e) => setMonthlyUpgradeDiscount(Number(e.target.value))}
                                  className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                  required
                                />
                                <p className="text-[10px] text-muted mt-1">Discount applied to the Monthly Base Price.</p>
                              </div>
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                                  Yearly Upgrade Discount (%)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  max="90"
                                  value={yearlyUpgradeDiscount}
                                  onChange={(e) => setYearlyUpgradeDiscount(Number(e.target.value))}
                                  className="lm-input text-sm h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                                  required
                                />
                                <p className="text-[10px] text-muted mt-1">Discount applied to the Yearly Base Price.</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-4 border-t border-border/40">
                            <button
                              type="submit"
                              disabled={savingSubSettings}
                              className="inline-flex items-center justify-center h-10 px-6 rounded-lg text-sm font-semibold transition bg-accent text-paper hover:bg-accent-light"
                            >
                              {savingSubSettings ? "Saving Settings..." : "Save Subscription Configuration"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
              </section>
            )}

            {activeTab === "layouts" && (
              <section className="space-y-6 animate-in fade-in duration-200">
                <div>
                  <h1 className="font-display text-4xl font-semibold text-ink">Layouts & Styling Manager</h1>
                  <p className="text-xs text-muted mt-0.5">Control the design layouts and 3D scenes for the platform pages.</p>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-ink mb-1">Home Page Layout</h3>
                    <p className="text-xs text-muted mb-4">Choose which structure design and background elements are active on the primary landing page.</p>

                    {loadingLayouts ? (
                      <div className="py-12 text-center text-sm text-muted">Loading layouts settings...</div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(availableLayouts.length > 0 ? availableLayouts : [
                          {
                            id: "classic",
                            name: "Classic 2D",
                            description: "Standard premium 2D dark glassmorphism layout with grids and smooth gradients."
                          }
                        ]).map((item) => {
                          const active = homeLayout === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleUpdateLayout("home", item.id)}
                              className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all ${
                                active
                                  ? "border-accent bg-accent/5"
                                  : "border-border/60 hover:border-accent bg-surface-soft/20 hover:bg-surface-soft/40"
                              }`}
                            >
                              <span className="font-bold text-sm text-ink mb-2">{item.name}</span>
                              <span className="text-xs text-muted leading-relaxed">{item.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-ink mb-1">Reader Page Layout</h3>
                    <p className="text-xs text-muted mb-4">Select the reader page layout style (Classic sidebar reader or Cinematic immersive dashboard).</p>

                    {loadingLayouts ? (
                      <div className="py-12 text-center text-sm text-muted">Loading layouts settings...</div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-3">
                        {(availableReaderLayouts.length > 0 ? availableReaderLayouts : [
                          {
                            id: "classic",
                            name: "Classic Reader",
                            description: "Traditional clean page layout with configurable fonts and side drawer navigation."
                          }
                        ]).map((item) => {
                          const active = readerLayout === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleUpdateLayout("reader", item.id)}
                              className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all ${
                                active
                                  ? "border-accent bg-accent/5"
                                  : "border-border/60 hover:border-accent bg-surface-soft/20 hover:bg-surface-soft/40"
                              }`}
                            >
                              <span className="font-bold text-sm text-ink mb-2">{item.name}</span>
                              <span className="text-xs text-muted leading-relaxed">{item.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* WALLET BALANCE ADJUSTMENT MODAL */}
      {adjustingUserWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-luxury flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  Adjust Wallet Balance
                </h3>
                <p className="text-xs text-muted">
                  Modify coin balance for {adjustingUserWallet.user}
                </p>
              </div>
              <button
                onClick={() => setAdjustingUserWallet(null)}
                className="text-muted hover:text-ink text-sm font-semibold transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-muted font-mono bg-muted/5 border border-border/50 p-2.5 rounded-lg">
                <span className="block font-bold">User Email:</span> {adjustingUserWallet.email}
                <span className="block font-bold mt-1.5">User ID:</span> {adjustingUserWallet.id}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Adjustment Action *
                  </label>
                  <select
                    value={walletAdjustAction}
                    onChange={(e) => setWalletAdjustAction(e.target.value)}
                    className="lm-input text-sm w-full h-10 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                  >
                    <option value="credit">Credit coins (+)</option>
                    <option value="debit">Debit coins (-)</option>
                    <option value="set">Set balance to (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Coins Amount *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    value={walletAdjustAmount}
                    onChange={(e) => setWalletAdjustAmount(e.target.value)}
                    className="lm-input text-sm w-full h-10 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Log Description / Reason *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Support credit for failed order"
                    value={walletAdjustDesc}
                    onChange={(e) => setWalletAdjustDesc(e.target.value)}
                    className="lm-input text-sm w-full h-10 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-border px-6 py-4 bg-surface-soft/40">
              <button
                type="button"
                onClick={() => setAdjustingUserWallet(null)}
                className="flex-1 lm-btn-secondary py-2.5 px-4 text-sm font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjustingWallet || !walletAdjustAmount || !walletAdjustDesc}
                onClick={() => handleAdjustWallet(adjustingUserWallet.id, false)}
                className="flex-1 lm-btn-primary py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Coins className="h-4 w-4" />
                {adjustingWallet ? "Adjusting..." : "Apply Adjust"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CENTER OVERLAY DETAILED PANEL MODAL (KPI Analytics Details) */}
      {selectedMetric && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-auto rounded-2xl shadow-luxury flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <div>
                <h3 className="font-display text-xl font-semibold text-ink uppercase tracking-wide">
                  {analyticsCards.find(c => c.key === selectedMetric)?.label} Details
                </h3>
                <p className="text-xs text-muted">
                  {analyticsCards.find(c => c.key === selectedMetric)?.detail}
                </p>
              </div>
              <button onClick={() => setSelectedMetric(null)} className="text-muted hover:text-ink font-bold text-lg">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Condition 1: User metrics */}
              {["totalUsers", "activeUsers", "verifiedEmail", "verifiedPhone", "newRegistrations"].includes(selectedMetric) && (
                <div className="space-y-4">
                  {loadingUsers ? (
                    <div className="py-20 text-center text-muted">Loading matching users...</div>
                  ) : (
                    (() => {
                      let filteredUsers = [...users];
                      if (selectedMetric === "activeUsers") filteredUsers = users.filter(u => u.status === "ACTIVE");
                      else if (selectedMetric === "verifiedEmail") filteredUsers = users.filter(u => u.emailVerifiedAt);
                      else if (selectedMetric === "verifiedPhone") filteredUsers = users.filter(u => u.phoneVerifiedAt);
                      else if (selectedMetric === "newRegistrations") {
                        const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                        filteredUsers = users.filter(u => new Date(u.createdAt) >= limitDate);
                      }

                      if (filteredUsers.length === 0) {
                        return <div className="py-20 text-center text-muted">No records match this metric in the database.</div>;
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[700px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                                <th className="pb-3">User</th>
                                <th className="pb-3">Email Address</th>
                                <th className="pb-3">Role</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Registration Date</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/5 transition-colors">
                                  <td className="py-3 font-semibold text-ink">{user.displayName || user.username || "Reader"}</td>
                                  <td className="py-3 text-soft-ink font-mono text-xs">{user.email}</td>
                                  <td className="py-3 uppercase text-xs font-mono">{user.role}</td>
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.status === "ACTIVE" ? "bg-success/15 text-success" : "bg-danger/10 text-danger"
                                      }`}>
                                      {user.status}
                                    </span>
                                  </td>
                                  <td className="py-3 text-xs text-muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedMetric(null);
                                        viewUserDetails(user.id);
                                      }}
                                      className="lm-btn-secondary px-2.5 py-1 text-xs"
                                    >
                                      View Profile
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Condition 2: Action Required / Refunds / Failed payments */}
              {["pendingRefunds", "failedPayments"].includes(selectedMetric) && (
                <div className="space-y-4">
                  {loadingPayments ? (
                    <div className="py-20 text-center text-muted">Loading payments logs...</div>
                  ) : (
                    (() => {
                      let filteredPayments = [...payments];
                      if (selectedMetric === "pendingRefunds") {
                        filteredPayments = payments.filter(p => p.status === "pending" || p.status === "created");
                      } else if (selectedMetric === "failedPayments") {
                        filteredPayments = payments.filter(p => p.status === "failed");
                      }

                      if (filteredPayments.length === 0) {
                        return <div className="py-20 text-center text-muted">No matching payments found in the database logs.</div>;
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[800px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                                <th className="pb-3">User Email</th>
                                <th className="pb-3">Order / Payment ID</th>
                                <th className="pb-3">Coins Package</th>
                                <th className="pb-3">Amount</th>
                                <th className="pb-3">Status</th>
                                <th className="pb-3">Date</th>
                                <th className="pb-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {filteredPayments.map((pay) => (
                                <tr key={pay.id} className="hover:bg-muted/5 transition-colors">
                                  <td className="py-3">
                                    <div className="font-semibold text-ink">{pay.user}</div>
                                    <div className="text-xs text-muted font-mono">{pay.email}</div>
                                  </td>
                                  <td className="py-3 font-mono text-xs text-muted">
                                    <div>Order: {pay.orderId}</div>
                                    <div>Pay: {pay.paymentId || "None"}</div>
                                  </td>
                                  <td className="py-3 font-medium text-soft-ink">{pay.packageName} ({pay.coinsReceived} coins)</td>
                                  <td className="py-3 text-accent font-semibold">Rs. {pay.amountPaid}</td>
                                  <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${pay.status === "paid"
                                      ? "bg-success/15 text-success"
                                      : pay.status === "failed"
                                        ? "bg-danger/10 text-danger"
                                        : "bg-warning/15 text-warning"
                                      }`}>
                                      {pay.status}
                                    </span>
                                  </td>
                                  <td className="py-3 text-xs text-muted">{pay.date}</td>
                                  <td className="py-3 text-right space-x-2">
                                    {pay.status === "pending" && (
                                      <button
                                        onClick={async () => {
                                          setSelectedMetric(null);
                                          setActiveTab("payments");
                                        }}
                                        className="lm-btn-primary px-2.5 py-1 text-xs"
                                      >
                                        Go to Ledger
                                      </button>
                                    )}
                                    {pay.status === "failed" && (
                                      <button
                                        disabled={verifyingPaymentId === pay.id}
                                        onClick={async () => {
                                          setVerifyingPaymentId(pay.id);
                                          try {
                                            const res = await fetch(`/api/admin/payments/${pay.id}/verify`, { method: "POST" });
                                            const body = await res.json();
                                            showToast(body.data?.message || "Verification retry processed.", "success");
                                            fetchPayments();
                                          } catch (err) {
                                            showToast("Error retrying verification", "error");
                                          } finally {
                                            setVerifyingPaymentId("");
                                          }
                                        }}
                                        className="lm-btn-secondary px-2.5 py-1 text-xs"
                                      >
                                        {verifyingPaymentId === pay.id ? "Verifying..." : "Verify Status"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Condition 3: Financial summaries */}
              {["totalRevenue", "monthlyRevenue", "subscriptionRevenue", "coinSales", "conversionRate"].includes(selectedMetric) && (
                <div className="space-y-4">
                  {loadingPayments ? (
                    <div className="py-20 text-center text-muted">Loading transaction records...</div>
                  ) : (
                    (() => {
                      const paidPayments = payments.filter(p => p.status === "paid");

                      if (paidPayments.length === 0) {
                        return <div className="py-20 text-center text-muted">No successful payments found in the ledger.</div>;
                      }

                      return (
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[800px] text-left text-sm">
                            <thead>
                              <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                                <th className="pb-3">User Email</th>
                                <th className="pb-3">Razorpay Order/Payment</th>
                                <th className="pb-3">Coins Package</th>
                                <th className="pb-3">Amount Paid</th>
                                <th className="pb-3">Payment Method</th>
                                <th className="pb-3">Completion Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {paidPayments.map((pay) => (
                                <tr key={pay.id} className="hover:bg-muted/5 transition-colors">
                                  <td className="py-3">
                                    <div className="font-semibold text-ink">{pay.user}</div>
                                    <div className="text-xs text-muted font-mono">{pay.email}</div>
                                  </td>
                                  <td className="py-3 font-mono text-xs text-muted">
                                    <div>Order: {pay.orderId}</div>
                                    <div>Payment: {pay.paymentId}</div>
                                  </td>
                                  <td className="py-3 font-medium text-soft-ink">{pay.packageName} ({pay.coinsReceived} coins)</td>
                                  <td className="py-3 text-success font-semibold">Rs. {pay.amountPaid}</td>
                                  <td className="py-3 text-xs uppercase tracking-wider font-mono text-muted">{pay.method}</td>
                                  <td className="py-3 text-xs text-muted">{pay.date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}

              {/* Condition 4: Total Stories */}
              {selectedMetric === "totalStories" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                          <th className="pb-3">Story Title</th>
                          <th className="pb-3">Genre</th>
                          <th className="pb-3">Chapters Count</th>
                          <th className="pb-3">Default Pricing</th>
                          <th className="pb-3">Free Chapters</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {data.stories.map((story) => (
                          <tr key={story.id} className="hover:bg-muted/5 transition-colors">
                            <td className="py-3 font-semibold text-ink">{story.title}</td>
                            <td className="py-3 text-soft-ink">{story.genre}</td>
                            <td className="py-3 font-mono text-xs">{story.chapters} chapters</td>
                            <td className="py-3 text-xs text-accent font-semibold">{story.defaultChapterCoinPrice ?? 0} coins</td>
                            <td className="py-3 text-xs text-muted">{story.freeChapters} chapters</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${story.published !== false ? "bg-success/15 text-success" : "bg-warning/10 text-warning"
                                }`}>
                                {story.published !== false ? "PUBLISHED" : "DRAFT"}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => {
                                  setSelectedMetric(null);
                                  setActiveTab("stories");
                                }}
                                className="lm-btn-secondary px-2.5 py-1 text-xs"
                              >
                                Manage Chapters
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Condition 5: Total Chapters */}
              {selectedMetric === "totalChapters" && (
                <div className="space-y-4">
                  {(() => {
                    const allChapters = data.stories.flatMap((story) =>
                      (story.chapterList || []).map((ch) => ({
                        ...ch,
                        storyTitle: story.title,
                        storySlug: story.slug
                      }))
                    );

                    if (allChapters.length === 0) {
                      return <div className="py-20 text-center text-muted">No published chapters found in the database.</div>;
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                              <th className="pb-3">Number</th>
                              <th className="pb-3">Chapter Title</th>
                              <th className="pb-3">Story</th>
                              <th className="pb-3">Type</th>
                              <th className="pb-3">Coin Price</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {allChapters.map((ch) => (
                              <tr key={ch.id} className="hover:bg-muted/5 transition-colors">
                                <td className="py-3 font-mono text-xs text-muted">Ch. {ch.number}</td>
                                <td className="py-3 font-semibold text-ink">
                                  {ch.title}
                                </td>
                                <td className="py-3 text-soft-ink">{ch.storyTitle}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ch.state === "free" ? "bg-success/15 text-success" : "bg-accent/15 text-accent"
                                    }`}>
                                    {ch.state === "free" ? "FREE" : "PAID"}
                                  </span>
                                </td>
                                <td className="py-3 font-mono text-xs text-muted">
                                  {ch.state === "free" ? "0" : `${ch.coinPrice} coins`}
                                </td>
                                <td className="py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedMetric(null);
                                      setActiveTab("stories");
                                    }}
                                    className="lm-btn-secondary px-2.5 py-1 text-xs"
                                  >
                                    View on Story Tab
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Condition 6: Studio Links */}
              {selectedMetric === "studioLinks" && (
                <div className="space-y-4">
                  {(() => {
                    const links = data.studioProjects || [];

                    if (links.length === 0) {
                      return <div className="py-20 text-center text-muted">No writing studio projects currently connected.</div>;
                    }

                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[800px] text-left text-sm border-separate border-spacing-x-6">
                          <thead>
                            <tr className="border-b border-border text-muted font-medium text-xs uppercase tracking-wider">
                              <th className="pb-3">Project Title</th>
                              <th className="pb-3">Connected Story</th>
                              <th className="pb-3">Source Type</th>
                              <th className="pb-3">Manuscript Files</th>
                              <th className="pb-3">Last Sync Date</th>
                              <th className="pb-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {links.map((link) => (
                              <tr key={link.id} className="hover:bg-muted/5 transition-colors">
                                <td className="py-3 font-semibold text-ink">{link.projectTitle || "Untitled Project"}</td>
                                <td className="py-3 text-soft-ink">
                                  {link.storyId ? (
                                    <span>
                                      {link.storyTitle}
                                      <span className="ml-2 text-[10px] uppercase font-bold text-success border border-success/30 px-1.5 py-0.5 rounded">
                                        {link.published ? "Live" : "Draft"}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-muted italic">Unlinked / Deleted</span>
                                  )}
                                </td>
                                <td className="py-3 text-xs uppercase tracking-wider font-mono text-muted">{link.source}</td>
                                <td className="py-3 font-mono text-xs">{link.cloudFileCount || 0} files</td>
                                <td className="py-3 text-xs text-muted">
                                  {link.cloudUpdatedAt
                                    ? new Date(link.cloudUpdatedAt).toLocaleString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })
                                    : "Never synced"}
                                </td>
                                <td className="py-3 text-right">
                                  {link.storyId && (
                                    <a
                                      href={buildStudioUrl(studioBaseUrl, platformUrl, {
                                        storyId: link.storyId,
                                        storyTitle: link.storyTitle,
                                        projectId: link.projectId
                                      })}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="lm-btn-secondary px-2.5 py-1 text-xs w-25"
                                    >
                                      Open Studio
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-border px-4 py-2 bg-surface-soft/40">
              <button
                onClick={() => setSelectedMetric(null)}
                className="lm-btn-secondary py-2 px-5 text-sm"
              >
                Close Detailed Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT COIN PACKAGE MODAL OVERLAY */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-luxury flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-soft/40">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {editingPackageId ? "Edit Coin Package" : "Create Coin Package"}
                </h3>
                <p className="text-xs text-muted">
                  {editingPackageId ? "Modify pricing tier details and discount rates" : "Configure a new regular purchase tier"}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsPackageModalOpen(false);
                  setEditingPackageId(null);
                }}
                className="text-muted hover:text-ink text-sm font-semibold transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePackage}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Package Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Starter Booster Pack"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Base Coins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={packageCoins}
                      onChange={(e) => setPackageCoins(Number(e.target.value))}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Bonus Coins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={packageBonus}
                      onChange={(e) => setPackageBonus(Number(e.target.value))}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Price (INR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={packagePrice}
                      onChange={(e) => setPackagePrice(Number(e.target.value))}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Campaign Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. discount-30"
                      value={packageCampaign}
                      onChange={(e) => setPackageCampaign(e.target.value)}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Manual Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={packageManualDiscount}
                      onChange={(e) => setPackageManualDiscount(Number(e.target.value))}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                      Combined Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={packageCombinedDiscount}
                      onChange={(e) => setPackageCombinedDiscount(Number(e.target.value))}
                      className="lm-input text-sm w-full h-10 py-2 px-3 rounded-lg bg-surface border border-border focus:border-accent outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                {packagePrice > 0 && (
                  <div className="bg-surface-soft/40 border border-border/80 p-3.5 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-ink uppercase tracking-wider block mb-1">Pricing Preview (INR)</span>
                    <div className="flex justify-between">
                      <span className="text-muted">Original Price:</span>
                      <span className="font-mono font-semibold">Rs. {packagePrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Manual Discount:</span>
                      <span className="font-mono text-accent font-semibold">-{packageManualDiscount}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Combined Discount:</span>
                      <span className="font-mono text-accent font-semibold">-{packageCombinedDiscount}%</span>
                    </div>
                    {isScheduledDiscountActive() && (
                      <div className="flex justify-between text-success font-semibold">
                        <span>Scheduled Discount ({activeDiscountCampaign || "Scheduled Campaign"}):</span>
                        <span className="font-mono">-{activeScheduledDiscountPercent}% (Active)</span>
                      </div>
                    )}
                    <div className="border-t border-border/40 my-1.5 pt-1.5 flex justify-between font-bold text-sm">
                      <span className="text-ink">Effective Price:</span>
                      <span className="font-mono text-accent">
                        Rs. {Math.max(0, Math.round(packagePrice * (1 - (packageManualDiscount + packageCombinedDiscount + (activeScheduledDiscountPercent)) / 100)))}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted border-t border-border/20 pt-1">
                      <span>Total Coins Received:</span>
                      <span>{packageCoins} (Base) + {packageBonus} (Bonus) = {packageCoins + packageBonus} coins</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="packageActiveCheckbox"
                    checked={packageActive}
                    onChange={(e) => setPackageActive(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                  />
                  <label htmlFor="packageActiveCheckbox" className="text-xs font-semibold text-soft-ink cursor-pointer">
                    Mark Package Active & Visible
                  </label>
                </div>
              </div>

              <div className="flex gap-3 border-t border-border px-6 py-4 bg-surface-soft/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsPackageModalOpen(false);
                    setEditingPackageId(null);
                  }}
                  className="flex-1 lm-btn-secondary py-2.5 px-4 text-sm font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPackage}
                  className="flex-1 lm-btn-primary py-2.5 px-4 text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {savingPackage ? "Saving..." : editingPackageId ? "Update Package" : "Create Package"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
