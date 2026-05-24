import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth/sessionServer";
import { AUTH_RULES } from "@/customerAccess/config/authRules";

function cleanString(value) {
  const cleaned = String(value || "").trim();
  return cleaned.length ? cleaned : null;
}

function normalizeComparableName(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

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

async function getNameUpdateStatus({ userId, rule }) {
  const maxUpdates = Number(rule.maxUpdates);

  if (!rule?.enabled || !Number.isFinite(maxUpdates) || maxUpdates < 1) {
    return {
      enabled: false,
      canUpdate: true,
      used: 0,
      remaining: null,
      maxUpdates: null,
      ruleLabel: "No name update limit is set",
    };
  }

  const now = new Date();
  const windowStart = getNameUpdateWindowStart(rule, now);

  const where = {
    userId,
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

  return {
    enabled: true,
    canUpdate: remaining > 0,
    used,
    remaining,
    maxUpdates,
    ruleLabel: getNameUpdateRuleLabel(rule),
  };
}

export async function POST(request) {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return Response.json({ error: "You must be logged in." }, { status: 401 });
    }

    const body = await request.json();

    const {
      name,
      country,
      city,
      addressLine1,
      addressLine2,
      parishOrRegion,
      postalCode,
    } = body;

    const nextName = cleanString(name);

    const existingUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!existingUser) {
      return Response.json({ error: "Account not found." }, { status: 404 });
    }

    const previousComparableName = normalizeComparableName(existingUser.name);
    const nextComparableName = normalizeComparableName(nextName);

    const nameChanged = previousComparableName !== nextComparableName;

    if (nameChanged) {
      const nameUpdateRule = getNameUpdateRule();

      const status = await getNameUpdateStatus({
        userId: session.userId,
        rule: nameUpdateRule,
      });

      if (status.enabled && !status.canUpdate) {
        return Response.json(
          {
            error: "You have reached the name update limit for this account.",
            message: `This account allows ${status.ruleLabel}.`,
            code: "NAME_UPDATE_LIMIT_REACHED",
            nameUpdateStatus: status,
          },
          { status: 429 }
        );
      }
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: session.userId },
        data: {
          name: nextName,
          country: cleanString(country),
          city: cleanString(city),
          addressLine1: cleanString(addressLine1),
          addressLine2: cleanString(addressLine2),
          parishOrRegion: cleanString(parishOrRegion),
          postalCode: cleanString(postalCode),
        },
        select: {
          id: true,
          name: true,
          country: true,
          city: true,
          addressLine1: true,
          addressLine2: true,
          parishOrRegion: true,
          postalCode: true,
          updatedAt: true,
        },
      });

      if (nameChanged && nextName) {
        await tx.userNameChange.create({
          data: {
            userId: session.userId,
            previousName: existingUser.name,
            newName: nextName,
          },
        });
      }

      return updatedUser;
    });

    const nameUpdateRule = getNameUpdateRule();
    const nameUpdateStatus = await getNameUpdateStatus({
      userId: session.userId,
      rule: nameUpdateRule,
    });

    return Response.json({
      ok: true,
      message: "Account information updated.",
      user,
      nameUpdateStatus,
    });
  } catch (error) {
    console.error("ACCOUNT UPDATE INFO ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}