import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { sendDueEmailSequenceJobs } from "@/lib/verification/emailSequences";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";
import {
  PERMANENT_WEBSITE_OP_TAG,
  permanentWebsiteOperationSequences,
} from "@/lib/verification/websiteOperationEmailTemplates";

type EmailSequenceConditionInput = {
  conditionType?: string;
  operator?: string;
  referenceKey?: string;
  value?: string;
  lookbackAmount?: number;
  lookbackUnit?: string;
};

type EmailSequenceStepInput = {
  stepKey?: string;
  name?: string;
  subject?: string;
  previewText?: string;
  fromName?: string;
  fromEmail?: string;
  replyToEmail?: string;
  bodyText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  sendTimingMode?: string;
  delayAmount?: number;
  delayUnit?: string;
  sendAtLocalTime?: string;
  timezoneMode?: string;
  activityDelayAmount?: number;
  activityDelayUnit?: string;
  skipIfAlreadySent?: boolean;
  requirePreviousStep?: boolean;
  active?: boolean;
  conditions?: EmailSequenceConditionInput[];
};

type EmailSequenceInput = {
  sequenceKey?: string;
  name?: string;
  description?: string;
  active?: boolean;
  audience?: string;
  triggerEvent?: string;
  defaultTimezone?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  consentRequired?: boolean;
  unsubscribeGroup?: string;
  steps?: EmailSequenceStepInput[];
  metadata?: Record<string, unknown>;
};

type NormalizedEmailSequenceStep = ReturnType<typeof normalizeSteps>[number];

const fallbackStorePath = path.join(
  process.cwd(),
  "data",
  "dashboard",
  "email-sequences.json"
);

export async function GET() {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  try {
    await ensurePermanentWebsiteOperationSequences();
    await ensureItaslLeadNurtureSequence();

    const sequences = await prisma.emailSequence.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: {
        steps: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: {
            conditions: {
              orderBy: [{ createdAt: "asc" }],
            },
          },
        },
        enrollments: {
          orderBy: [{ enrolledAt: "desc" }],
          take: 100,
          include: {
            jobs: {
              orderBy: [{ scheduledFor: "asc" }],
              include: {
                step: {
                  select: {
                    stepKey: true,
                    name: true,
                  },
                },
              },
            },
            events: {
              orderBy: [{ createdAt: "desc" }],
              take: 100,
            },
          },
        },
      },
    });

    return NextResponse.json({
      sequences: sequences.map(serializeSequenceForDashboard),
    });
  } catch (error) {
    const sequences = await readFallbackSequences();

    return NextResponse.json({
      sequences,
      source: "local-fallback",
      warning: getErrorMessage(error, "Database unavailable."),
    });
  }
}

function serializeSequenceForDashboard(sequence: any) {
  const enrollments = Array.isArray(sequence.enrollments)
    ? sequence.enrollments
    : [];

  return {
    ...sequence,
    recipientActivity: enrollments.map((enrollment: any) => {
      const events = Array.isArray(enrollment.events) ? enrollment.events : [];
      const jobs = Array.isArray(enrollment.jobs) ? enrollment.jobs : [];
      const sentEvents = events.filter((event: any) => event.eventType === "sent");
      const openedEvents = events.filter(
        (event: any) =>
          event.eventType === "opened_email" ||
          event.eventType === "opened_slide"
      );
      const clickedEvents = events.filter(
        (event: any) => event.eventType === "clicked_link"
      );
      const failedEvents = events.filter(
        (event: any) => event.eventType === "failed" || event.eventType === "bounced"
      );
      const failedJobs = jobs.filter(
        (job: any) => job.status === "FAILED" || Boolean(job.failedAt)
      );

      return {
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        recipientEmail: enrollment.recipientEmail,
        recipientName: enrollment.recipientName,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        lastSentAt: getLatestDate([
          ...sentEvents.map((event: any) => event.createdAt),
          ...jobs.map((job: any) => job.sentAt),
        ]),
        lastOpenedAt: getLatestDate(
          openedEvents.map((event: any) => event.createdAt)
        ),
        lastClickedAt: getLatestDate(
          clickedEvents.map((event: any) => event.createdAt)
        ),
        lastFailedAt: getLatestDate([
          ...failedEvents.map((event: any) => event.createdAt),
          ...failedJobs.map((job: any) => job.failedAt),
        ]),
        sentCount: sentEvents.length || jobs.filter((job: any) => job.sentAt).length,
        openedCount: openedEvents.length,
        clickedCount: clickedEvents.length,
        failedCount: failedEvents.length || failedJobs.length,
        jobs: jobs.map((job: any) => ({
          id: job.id,
          stepKey: job.step?.stepKey ?? null,
          stepName: job.step?.name ?? null,
          status: job.status,
          scheduledFor: job.scheduledFor,
          sentAt: job.sentAt,
          failedAt: job.failedAt,
          lastError: job.lastError,
          provider: job.provider,
        })),
        events: events.map((event: any) => ({
          id: event.id,
          eventType: event.eventType,
          eventKey: event.eventKey,
          createdAt: event.createdAt,
          metadata: event.metadata,
        })),
      };
    }),
  };
}

function getLatestDate(values: unknown[]) {
  const latest = values
    .filter(Boolean)
    .map((value) => new Date(String(value)))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0];

  return latest ? latest.toISOString() : null;
}

export async function POST(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = (await request.json().catch(() => null)) as
    | EmailSequenceInput
    | null;
  const sequenceKey = sanitizeKey(body?.sequenceKey || body?.name);
  const name = String(body?.name ?? "").trim();

  if (!sequenceKey) {
    return NextResponse.json(
      { error: "Sequence key or name is required." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Sequence name is required." },
      { status: 400 }
    );
  }

  const steps = normalizeSteps(body?.steps);

  if (!steps.length) {
    return NextResponse.json(
      { error: "At least one email step is required." },
      { status: 400 }
    );
  }

  try {
    const sequence = await prisma.$transaction(async (tx) => {
    const existingSequence = await tx.emailSequence.findUnique({
      where: { sequenceKey },
    });
    const metadata = getSequenceMetadata(body, existingSequence?.metadata);

    const savedSequence = await tx.emailSequence.upsert({
      where: { sequenceKey },
      create: {
        sequenceKey,
        name,
        description: cleanText(body?.description),
        active: body?.active === true,
        audience: cleanText(body?.audience) ?? "all_users",
        triggerEvent: normalizeTriggerEvent(body?.triggerEvent),
        defaultTimezone: normalizeTimezoneMode(body?.defaultTimezone),
        sendWindowStart: cleanText(body?.sendWindowStart),
        sendWindowEnd: cleanText(body?.sendWindowEnd),
        consentRequired: body?.consentRequired !== false,
        unsubscribeGroup: cleanText(body?.unsubscribeGroup),
        metadata,
      },
      update: {
        name,
        description: cleanText(body?.description),
        active: body?.active === true,
        audience: cleanText(body?.audience) ?? "all_users",
        triggerEvent: normalizeTriggerEvent(body?.triggerEvent),
        defaultTimezone: normalizeTimezoneMode(body?.defaultTimezone),
        sendWindowStart: cleanText(body?.sendWindowStart),
        sendWindowEnd: cleanText(body?.sendWindowEnd),
        consentRequired: body?.consentRequired !== false,
        unsubscribeGroup: cleanText(body?.unsubscribeGroup),
        metadata,
      },
    });

    await tx.emailSequenceStep.deleteMany({
      where: { sequenceId: savedSequence.id },
    });

    for (const [index, step] of steps.entries()) {
      await tx.emailSequenceStep.create({
        data: {
          sequenceId: savedSequence.id,
          stepKey: step.stepKey,
          sortOrder: index,
          name: step.name,
          subject: step.subject,
          previewText: step.previewText,
          fromName: step.fromName,
          fromEmail: step.fromEmail,
          replyToEmail: step.replyToEmail,
          bodyText: step.bodyText,
          ctaLabel: step.ctaLabel,
          ctaUrl: step.ctaUrl,
          sendTimingMode: step.sendTimingMode,
          delayAmount: step.delayAmount,
          delayUnit: step.delayUnit,
          sendAtLocalTime: step.sendAtLocalTime,
          timezoneMode: step.timezoneMode,
          activityDelayAmount: step.activityDelayAmount,
          activityDelayUnit: step.activityDelayUnit,
          skipIfAlreadySent: step.skipIfAlreadySent,
          requirePreviousStep: step.requirePreviousStep,
          active: step.active,
          conditions: {
            create: step.conditions,
          },
        },
      });
    }

    return tx.emailSequence.findUnique({
      where: { id: savedSequence.id },
      include: {
        steps: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { conditions: true },
        },
      },
    });
  });

    return NextResponse.json({ sequence, source: "database" });
  } catch (error) {
    const sequence = await saveFallbackSequence({
      body,
      sequenceKey,
      name,
      steps,
    });

    return NextResponse.json({
      sequence,
      source: "local-fallback",
      warning: getErrorMessage(error, "Database unavailable."),
    });
  }
}

export async function PATCH(request: Request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  const body = (await request.json().catch(() => null)) as
    | { action?: string; limit?: number }
    | null;

  if (body?.action !== "send-due") {
    return NextResponse.json(
      { error: "Unsupported email sequence action." },
      { status: 400 }
    );
  }

  try {
    const result = await sendDueEmailSequenceJobs({
      limit: Number(body?.limit || 25),
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: getErrorMessage(error, "Could not send due email sequence jobs."),
      },
      { status: 500 }
    );
  }
}

function jsonError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);

  return NextResponse.json(
    {
      error: message || fallback,
    },
    { status: 500 }
  );
}

async function readFallbackSequences() {
  try {
    const text = await readFile(fallbackStorePath, "utf8");
    const data = JSON.parse(text) as { sequences?: unknown };

    return Array.isArray(data.sequences) ? data.sequences : [];
  } catch {
    return [];
  }
}

async function saveFallbackSequence({
  body,
  sequenceKey,
  name,
  steps,
}: {
  body: EmailSequenceInput | null;
  sequenceKey: string;
  name: string;
  steps: NormalizedEmailSequenceStep[];
}) {
  const sequences = (await readFallbackSequences()) as Array<Record<string, unknown>>;
  const now = new Date().toISOString();
  const existing = sequences.find(
    (sequence) => sequence.sequenceKey === sequenceKey
  );
  const sequence = {
    id: String(existing?.id ?? `local-${sequenceKey}`),
    sequenceKey,
    name,
    description: cleanText(body?.description) ?? null,
    active: body?.active === true,
    audience: cleanText(body?.audience) ?? "all_users",
    triggerEvent: normalizeTriggerEvent(body?.triggerEvent),
    defaultTimezone: normalizeTimezoneMode(body?.defaultTimezone),
    sendWindowStart: cleanText(body?.sendWindowStart) ?? null,
    sendWindowEnd: cleanText(body?.sendWindowEnd) ?? null,
    consentRequired: body?.consentRequired !== false,
    unsubscribeGroup: cleanText(body?.unsubscribeGroup) ?? null,
    createdAt: String(existing?.createdAt ?? now),
    updatedAt: now,
    steps: steps.map((step, index) => ({
      id: `local-${sequenceKey}-${step.stepKey}`,
      sequenceId: String(existing?.id ?? `local-${sequenceKey}`),
      sortOrder: index,
      createdAt: now,
      updatedAt: now,
      ...step,
      conditions: step.conditions.map((condition, conditionIndex) => ({
        id: `local-${sequenceKey}-${step.stepKey}-condition-${conditionIndex}`,
        stepId: `local-${sequenceKey}-${step.stepKey}`,
        createdAt: now,
        updatedAt: now,
        ...condition,
      })),
    })),
  };
  const nextSequences = [
    sequence,
    ...sequences.filter((item) => item.sequenceKey !== sequenceKey),
  ];

  await mkdir(path.dirname(fallbackStorePath), { recursive: true });
  await writeFile(
    fallbackStorePath,
    JSON.stringify({ sequences: nextSequences }, null, 2)
  );

  return sequence;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message || fallback : fallback;
}

async function ensurePermanentWebsiteOperationSequences() {
  for (const template of permanentWebsiteOperationSequences) {
    await prisma.emailSequence.upsert({
      where: { sequenceKey: template.sequenceKey },
      create: {
        sequenceKey: template.sequenceKey,
        name: template.name,
        description: template.description,
        active: true,
        audience: "website_operations",
        triggerEvent: template.triggerEvent,
        defaultTimezone: "site",
        consentRequired: false,
        unsubscribeGroup: "website-operations",
        metadata: {
          systemTag: PERMANENT_WEBSITE_OP_TAG,
          protected: true,
          deleteDisabled: true,
          editable: true,
        },
        steps: {
          create: {
            stepKey: template.stepKey,
            sortOrder: 0,
            name: "Email message",
            subject: template.subject,
            bodyText: template.bodyText,
            sendTimingMode: "immediate",
            delayAmount: 0,
            delayUnit: "minutes",
            timezoneMode: "site",
            skipIfAlreadySent: false,
            requirePreviousStep: false,
            active: true,
            conditions: {
              create: {
                conditionType: "always",
                operator: "is",
              },
            },
          },
        },
      },
      update: {
        metadata: {
          systemTag: PERMANENT_WEBSITE_OP_TAG,
          protected: true,
          deleteDisabled: true,
          editable: true,
        },
      },
    });
  }
}

async function ensureItaslLeadNurtureSequence() {
  const sequenceKey = "itasl-lead-nurture";
  const existing = await prisma.emailSequence.findUnique({
    where: { sequenceKey },
    select: { id: true },
  });

  if (existing) {
    await prisma.emailSequence.update({
      where: { id: existing.id },
      data: {
        active: true,
        triggerEvent: "tag_added",
        metadata: {
          dripSequenceKey: "itasl",
          editable: true,
        },
      },
    });

    await prisma.emailSequenceStep.updateMany({
      where: {
        sequenceId: existing.id,
      },
      data: {
        active: true,
      },
    });

    await prisma.emailSequenceStep.updateMany({
      where: {
        sequenceId: existing.id,
        stepKey: "itasl-day-01",
      },
      data: {
        sendTimingMode: "delay",
        delayAmount: 1,
        delayUnit: "minutes",
        requirePreviousStep: false,
      },
    });

    return;
  }

  await prisma.emailSequence.create({
    data: {
      sequenceKey,
      name: "ITASL lead nurture",
      description:
        "Daily invitation-to-Amity-Sereavo-Live slide links. Each slide opens for the user before its email is sent.",
      active: true,
      audience: "itasl-leads",
      triggerEvent: "tag_added",
      defaultTimezone: "user",
      consentRequired: true,
      unsubscribeGroup: "lead-nurture",
      metadata: {
        dripSequenceKey: "itasl",
        editable: true,
      },
      steps: {
        create: Array.from({ length: 15 }, (_, index) => {
          const day = index + 1;
          const dayKey = `itasl-day-${String(day).padStart(2, "0")}`;
          const previousDayKey =
            index > 0
              ? `itasl-day-${String(day - 1).padStart(2, "0")}`
              : null;

          return {
            stepKey: dayKey,
            sortOrder: index,
            name: `Day ${day} slide`,
            subject:
              day === 1
                ? "Your first invitation video is ready"
                : `Your invitation video ${day} is ready`,
            previewText: "Open today's private Amity Sereavo Live invitation slide.",
            bodyText:
              day === 1
                ? "Here is the first private invitation video in the Amity Sereavo Live sequence."
                : "Here is the next private invitation video in the Amity Sereavo Live sequence.",
            ctaLabel: "Open today's video",
            ctaUrl: `http://localhost:3000/questionnaire/itasl?slide=${dayKey}&unlockKey=${dayKey}&dripSequenceKey=itasl`,
            sendTimingMode: "delay",
            delayAmount: index === 0 ? 1 : index,
            delayUnit: index === 0 ? "minutes" : "days",
            timezoneMode: "user",
            skipIfAlreadySent: true,
            requirePreviousStep: index > 0,
            active: true,
            metadata: {
              dripSequenceKey: "itasl",
              dripUnlockKey: dayKey,
              slideId: dayKey,
            },
            conditions: {
              create: [
                {
                  conditionType: "has_tag",
                  operator: "is",
                  referenceKey: "itasl-lead",
                },
                ...(previousDayKey
                  ? [
                      {
                        conditionType: "clicked_link",
                        operator: "is",
                        referenceKey: previousDayKey,
                      },
                    ]
                  : []),
              ],
            },
          };
        }),
      },
    },
  });
}

function getSequenceMetadata(
  body: EmailSequenceInput | null,
  existingMetadata: unknown = null
) {
  const existing =
    existingMetadata && typeof existingMetadata === "object"
      ? (existingMetadata as Record<string, unknown>)
      : {};
  const incoming =
    body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
  const protectedRecord =
    existing.systemTag === PERMANENT_WEBSITE_OP_TAG ||
    incoming.systemTag === PERMANENT_WEBSITE_OP_TAG;

  return {
    ...existing,
    ...incoming,
    ...(protectedRecord
      ? {
          systemTag: PERMANENT_WEBSITE_OP_TAG,
          protected: true,
          deleteDisabled: true,
          editable: true,
        }
      : {}),
  };
}

function normalizeSteps(input: EmailSequenceStepInput[] | undefined) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((step, index) => {
      const stepKey = sanitizeKey(step.stepKey || step.name || `step-${index + 1}`);
      const name = String(step.name ?? "").trim();
      const subject = String(step.subject ?? "").trim();
      const bodyText = String(step.bodyText ?? "").trim();

      if (!stepKey || !name || !subject || !bodyText) {
        return null;
      }

      return {
        stepKey,
        name,
        subject,
        previewText: cleanText(step.previewText),
        fromName: cleanText(step.fromName),
        fromEmail: cleanText(step.fromEmail),
        replyToEmail: cleanText(step.replyToEmail),
        bodyText,
        ctaLabel: cleanText(step.ctaLabel),
        ctaUrl: cleanText(step.ctaUrl),
        sendTimingMode: normalizeChoice(step.sendTimingMode, [
          "immediate",
          "delay",
          "scheduled_time",
          "after_activity",
        ], "delay"),
        delayAmount: toNonNegativeInt(step.delayAmount),
        delayUnit: normalizeChoice(step.delayUnit, [
          "minutes",
          "hours",
          "days",
          "weeks",
        ], "minutes"),
        sendAtLocalTime: cleanText(step.sendAtLocalTime),
        timezoneMode: normalizeTimezoneMode(step.timezoneMode),
        activityDelayAmount:
          step.activityDelayAmount === undefined
            ? undefined
            : toNonNegativeInt(step.activityDelayAmount),
        activityDelayUnit: step.activityDelayUnit
          ? normalizeChoice(step.activityDelayUnit, [
              "minutes",
              "hours",
              "days",
              "weeks",
            ], "hours")
          : undefined,
        skipIfAlreadySent: step.skipIfAlreadySent !== false,
        requirePreviousStep: step.requirePreviousStep !== false,
        active: step.active !== false,
        conditions: normalizeConditions(step.conditions),
      };
    })
    .filter(Boolean) as Array<{
    stepKey: string;
    name: string;
    subject: string;
    previewText?: string;
    fromName?: string;
    fromEmail?: string;
    replyToEmail?: string;
    bodyText: string;
    ctaLabel?: string;
    ctaUrl?: string;
    sendTimingMode: string;
    delayAmount: number;
    delayUnit: string;
    sendAtLocalTime?: string;
    timezoneMode: string;
    activityDelayAmount?: number;
    activityDelayUnit?: string;
    skipIfAlreadySent: boolean;
    requirePreviousStep: boolean;
    active: boolean;
    conditions: Array<{
      conditionType: string;
      operator: string;
      referenceKey?: string;
      value?: string;
      lookbackAmount?: number;
      lookbackUnit?: string;
    }>;
  }>;
}

function normalizeConditions(input: EmailSequenceConditionInput[] | undefined) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((condition) => {
      const conditionType = normalizeChoice(condition.conditionType, [
        "always",
        "opened_email",
        "did_not_open_email",
        "clicked_link",
        "did_not_click_link",
        "purchased_item",
        "has_not_purchased_item",
        "completed_slide",
        "answered_question",
        "has_tag",
        "does_not_have_tag",
      ], "always");

      return {
        conditionType,
        operator: cleanText(condition.operator) ?? "is",
        referenceKey: cleanText(condition.referenceKey),
        value: cleanText(condition.value),
        lookbackAmount:
          condition.lookbackAmount === undefined
            ? undefined
            : toNonNegativeInt(condition.lookbackAmount),
        lookbackUnit: condition.lookbackUnit
          ? normalizeChoice(condition.lookbackUnit, [
              "minutes",
              "hours",
              "days",
              "weeks",
            ], "days")
          : undefined,
      };
    })
    .filter(Boolean);
}

function sanitizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : undefined;
}

function normalizeTimezoneMode(value: unknown) {
  return normalizeChoice(value, ["user", "sequence", "site"], "user");
}

function normalizeTriggerEvent(value: unknown) {
  const normalized = normalizeChoice(
    value,
    [
      "signup",
      "purchase",
      "ticket_purchase",
      "album_purchase",
      "manual_tag",
      "tag_added",
      "website_operation",
    ],
    "signup"
  );

  return normalized === "manual_tag" ? "tag_added" : normalized;
}

function normalizeChoice(
  value: unknown,
  allowed: string[],
  fallback: string
) {
  const text = String(value ?? "").trim();
  return allowed.includes(text) ? text : fallback;
}

function toNonNegativeInt(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
}
