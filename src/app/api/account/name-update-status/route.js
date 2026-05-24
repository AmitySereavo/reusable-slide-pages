import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { AUTH_RULES } from "@/customerAccess/config/authRules";

function getNameUpdateRule() {
  return (
    AUTH_RULES.accountInfo?.nameUpdate ?? {
      enabled: true,
      window: "forever",
      maxUpdates: 2,
      rollingDays: null,
      rollingMonths: null,
    }
  );
}

function getNameUpdateWindowStart(rule, now) {
  if (!rule || rule.window === "forever") {
    return null;
  }

  if (rule.window === "calendarMonth") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (rule.window === "rollingDays") {
    const days = Number(rule.rollingDays);

    if (!Number.isFinite(days) || days <= 0) {
      return null;
    }

    const start = new Date(now);
    start.setDate(start.getDate() - days);
    return start;
  }

  if (rule.window === "rollingMonths") {
    const months = Number(rule.rollingMonths);

    if (!Number.isFinite(months) || months <= 0) {
      return null;
    }

    const start = new Date(now);
    start.setMonth(start.getMonth() - months);
    return start;
  }

  return null;
}

function getNameUpdateRuleLabel(rule) {
  const maxUpdates = Number(rule?.maxUpdates ?? 0);
  const updateLabel = maxUpdates === 1 ? "update" : "updates";

  if (rule?.window === "calendarMonth") {
    return `${maxUpdates} ${updateLabel} per month`;
  }

  if (rule?.window === "rollingDays") {
    return `${maxUpdates} ${updateLabel} every ${rule.rollingDays} days`;
  }

  if (rule?.window === "rollingMonths") {
    return `${maxUpdates} ${updateLabel} every ${rule.rollingMonths} months`;
  }

  return `${maxUpdates} ${updateLabel} forever`;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const rule = getNameUpdateRule();
    const maxUpdates = Number(rule.maxUpdates);

    if (!rule.enabled || !Number.isFinite(maxUpdates) || maxUpdates < 1) {
      return Response.json({
        ok: true,
        enabled: false,
        canUpdate: true,
        used: 0,
        remaining: null,
        maxUpdates: null,
        ruleLabel: "No name update limit is set",
        window: rule.window ?? "forever",
        windowStart: null,
      });
    }

    const now = new Date();
    const windowStart = getNameUpdateWindowStart(rule, now);

    const where = {
      userId: session.userId,
      ...(windowStart
        ? {
            createdAt: {
              gte: windowStart,
            },
          }
        : {}),
    };

    const used = await prisma.userNameChange.count({ where });
    const remaining = Math.max(0, maxUpdates - used);

    return Response.json({
      ok: true,
      enabled: true,
      canUpdate: remaining > 0,
      used,
      remaining,
      maxUpdates,
      ruleLabel: getNameUpdateRuleLabel(rule),
      window: rule.window ?? "forever",
      windowStart: windowStart ? windowStart.toISOString() : null,
    });
  } catch (error) {
    console.error("ACCOUNT NAME UPDATE STATUS ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}