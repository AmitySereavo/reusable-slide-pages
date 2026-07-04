import { prisma } from "@/lib/prisma";
import { sendEmailMessage } from "@/lib/verification/emailMessage";
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_JOBS_PER_RUN = 25;
const scheduledDueRuns = new Map();
const fallbackSequencePath = path.join(
  process.cwd(),
  "data",
  "dashboard",
  "email-sequences.json"
);
const fallbackJobsPath = path.join(
  process.cwd(),
  "data",
  "dashboard",
  "email-sequence-jobs.json"
);

export async function ensureItaslLeadNurtureSequence() {
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

    return existing;
  }

  return prisma.emailSequence.create({
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function addDelay(date, amount, unit) {
  const value = Math.max(0, Number(amount) || 0);
  const next = new Date(date);

  if (unit === "weeks") {
    next.setDate(next.getDate() + value * 7);
  } else if (unit === "days") {
    next.setDate(next.getDate() + value);
  } else if (unit === "hours") {
    next.setHours(next.getHours() + value);
  } else {
    next.setMinutes(next.getMinutes() + value);
  }

  return next;
}

function getScheduledFor(step, enrolledAt) {
  if (step.sendTimingMode === "immediate") {
    return enrolledAt;
  }

  if (step.sendTimingMode === "scheduled_time" && step.sendAtLocalTime) {
    const [hours, minutes] = String(step.sendAtLocalTime)
      .split(":")
      .map((part) => Number(part));
    const scheduled = new Date(enrolledAt);
    scheduled.setHours(Number.isFinite(hours) ? hours : 9);
    scheduled.setMinutes(Number.isFinite(minutes) ? minutes : 0);
    scheduled.setSeconds(0);
    scheduled.setMilliseconds(0);

    if (scheduled < enrolledAt) {
      scheduled.setDate(scheduled.getDate() + 1);
    }

    return scheduled;
  }

  return addDelay(enrolledAt, step.delayAmount, step.delayUnit);
}

function scheduleDueEmailSequenceRunAt(runAt) {
  if (!runAt) {
    return;
  }

  const scheduledAt = new Date(runAt);
  const timestamp = scheduledAt.getTime();

  if (!Number.isFinite(timestamp)) {
    return;
  }

  const key = String(timestamp);

  if (scheduledDueRuns.has(key)) {
    return;
  }

  const delayMs = Math.max(0, timestamp - Date.now()) + 1000;
  const timeout = setTimeout(() => {
    scheduledDueRuns.delete(key);
    void sendDueEmailSequenceJobs({ limit: MAX_JOBS_PER_RUN }).catch((error) => {
      console.warn("Scheduled email sequence run failed.", error);
    });
  }, delayMs);

  if (typeof timeout.unref === "function") {
    timeout.unref();
  }

  scheduledDueRuns.set(key, timeout);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildHtmlFromText(text, ctaLabel, ctaUrl) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");

  const cta =
    ctaLabel && ctaUrl
      ? `<p><a href="${escapeHtml(ctaUrl)}">${escapeHtml(ctaLabel)}</a></p>`
      : "";

  return `${paragraphs}${cta}`;
}

function getDripUnlockFromUrl(ctaUrl) {
  if (!ctaUrl) {
    return null;
  }

  try {
    const url = new URL(String(ctaUrl), "http://localhost");
    const unlockKey = url.searchParams.get("unlockKey");
    const slideId = url.searchParams.get("slide");
    const sequenceKey =
      url.searchParams.get("dripSequenceKey") ||
      url.pathname.split("/").filter(Boolean).pop();

    if (!unlockKey || !sequenceKey) {
      return null;
    }

    return {
      dripSequenceKey: sequenceKey,
      unlockKey,
      slideId,
    };
  } catch {
    return null;
  }
}

function appendSequenceJobIdToCtaUrl(ctaUrl, jobId) {
  if (!ctaUrl || !jobId) {
    return ctaUrl;
  }

  try {
    const isAbsolute = /^https?:\/\//i.test(String(ctaUrl));
    const url = new URL(String(ctaUrl), "http://localhost");
    url.searchParams.set("sequenceJobId", jobId);

    return isAbsolute ? url.toString() : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return ctaUrl;
  }
}

function renderTemplate(value, context) {
  return String(value || "").replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => {
    const parts = String(key).split(".");
    let current = context;

    for (const part of parts) {
      if (!current || typeof current !== "object") {
        return "";
      }

      current = current[part];
    }

    return current == null ? "" : String(current);
  });
}

function buildContext({ user, recipientEmail, recipientName, context }) {
  return {
    ...(context && typeof context === "object" ? context : {}),
    user: {
      id: user?.id || null,
      name: user?.name || recipientName || "",
      email: user?.email || recipientEmail,
    },
    name: recipientName || user?.name || "",
    email: recipientEmail,
  };
}

function normalizeTagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getConditionTagKey(condition) {
  return normalizeTagKey(condition?.referenceKey || condition?.value);
}

function sequenceMatchesTriggerContext(sequence, triggerEvent, context) {
  if (triggerEvent !== "tag_added" && triggerEvent !== "manual_tag") {
    return true;
  }

  const addedTagKey = normalizeTagKey(context?.tagKey);

  if (!addedTagKey) {
    return false;
  }

  const tagConditions = (sequence.steps || [])
    .flatMap((step) => step.conditions || [])
    .filter((condition) => condition.conditionType === "has_tag");

  if (!tagConditions.length) {
    return true;
  }

  return tagConditions.some(
    (condition) => getConditionTagKey(condition) === addedTagKey
  );
}

async function readLocalSequences() {
  try {
    const text = await readFile(fallbackSequencePath, "utf8");
    const data = JSON.parse(text);

    return Array.isArray(data.sequences) ? data.sequences : [];
  } catch {
    return [];
  }
}

async function readLocalJobs() {
  try {
    const text = await readFile(fallbackJobsPath, "utf8");
    const data = JSON.parse(text);

    return Array.isArray(data.jobs) ? data.jobs : [];
  } catch {
    return [];
  }
}

async function writeLocalJobs(jobs) {
  await writeFile(fallbackJobsPath, JSON.stringify({ jobs }, null, 2));
}

async function enrollLocalEmailSequencesForTrigger({
  triggerEvent,
  user = null,
  email,
  name = null,
  context = null,
}) {
  const recipientEmail = normalizeEmail(email || user?.email);

  if (!triggerEvent || !recipientEmail) {
    return {
      enrolled: 0,
      jobsCreated: 0,
      source: "local-fallback",
    };
  }

  const sequences = (await readLocalSequences()).filter(
    (sequence) =>
      sequence?.active === true &&
      sequence?.triggerEvent === triggerEvent &&
      sequenceMatchesTriggerContext(sequence, triggerEvent, context)
  );
  const jobs = await readLocalJobs();
  const now = new Date();
  let enrolled = 0;
  let jobsCreated = 0;
  let soonestScheduledFor = null;

  for (const sequence of sequences) {
    enrolled += 1;
    const enrollmentId = `local-enrollment-${sequence.sequenceKey}-${recipientEmail}`;
    const recipientName = name || user?.name || "";
    const templateContext = buildContext({
      user,
      recipientEmail,
      recipientName,
      context,
    });

    for (const [index, step] of (sequence.steps || []).entries()) {
      if (step?.active === false) {
        continue;
      }

      const existingJob = jobs.find(
        (job) => job.enrollmentId === enrollmentId && job.stepKey === step.stepKey
      );

      if (existingJob) {
        continue;
      }

      const subject = renderTemplate(step.subject, templateContext);
      const bodyText = renderTemplate(step.bodyText, templateContext);
      const ctaUrl = step.ctaUrl ? renderTemplate(step.ctaUrl, templateContext) : null;
      const ctaLabel = step.ctaLabel
        ? renderTemplate(step.ctaLabel, templateContext)
        : null;

      jobs.push({
        id: crypto.randomUUID(),
        sequenceId: sequence.id,
        sequenceKey: sequence.sequenceKey,
        stepId: step.id || `local-${sequence.sequenceKey}-${step.stepKey}`,
        stepKey: step.stepKey,
        stepSortOrder: Number(step.sortOrder ?? index),
        requirePreviousStep: step.requirePreviousStep !== false,
        enrollmentId,
        userId: user?.id || null,
        recipientEmail,
        recipientName,
        subject,
        previewText: step.previewText
          ? renderTemplate(step.previewText, templateContext)
          : null,
        fromName: step.fromName || null,
        fromEmail: step.fromEmail || null,
        replyToEmail: step.replyToEmail || null,
        bodyText,
        bodyHtml: buildHtmlFromText(bodyText, ctaLabel, ctaUrl),
        ctaLabel,
        ctaUrl,
        status: "PENDING",
        scheduledFor: getScheduledFor(step, now).toISOString(),
        attempts: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const scheduledFor = getScheduledFor(step, now);
      soonestScheduledFor =
        !soonestScheduledFor || scheduledFor < soonestScheduledFor
          ? scheduledFor
          : soonestScheduledFor;
      jobsCreated += 1;
    }
  }

  await writeLocalJobs(jobs);

  if (soonestScheduledFor) {
    scheduleDueEmailSequenceRunAt(soonestScheduledFor);
  }

  return {
    enrolled,
    jobsCreated,
    source: "local-fallback",
  };
}

async function localPreviousStepSent(job, jobs) {
  if (!job.requirePreviousStep || Number(job.stepSortOrder) <= 0) {
    return true;
  }

  const previousJob = jobs
    .filter(
      (candidate) =>
        candidate.enrollmentId === job.enrollmentId &&
        Number(candidate.stepSortOrder) < Number(job.stepSortOrder)
    )
    .sort((left, right) => Number(right.stepSortOrder) - Number(left.stepSortOrder))[0];

  return !previousJob || previousJob.status === "SENT";
}

async function sendLocalDueEmailSequenceJobs({ limit = MAX_JOBS_PER_RUN } = {}) {
  const jobs = await readLocalJobs();
  const now = new Date();
  const dueJobs = jobs
    .filter(
      (job) =>
        job.status === "PENDING" &&
        job.scheduledFor &&
        new Date(job.scheduledFor).getTime() <= now.getTime()
    )
    .sort((left, right) => new Date(left.scheduledFor) - new Date(right.scheduledFor))
    .slice(0, Math.max(1, Math.min(Number(limit) || MAX_JOBS_PER_RUN, 100)));
  const results = [];

  for (const job of dueJobs) {
    const canSend = await localPreviousStepSent(job, jobs);

    if (!canSend) {
      results.push({
        jobId: job.id,
        status: "waiting_for_previous_step",
      });
      continue;
    }

    job.status = "SENDING";
    job.attempts = Number(job.attempts || 0) + 1;
    job.updatedAt = new Date().toISOString();

    const deliveryResult = await sendEmailMessage({
      to: job.recipientEmail,
      subject: job.subject,
      text: job.bodyText,
      html: job.bodyHtml,
      fromEmail: job.fromEmail,
      fromName: job.fromName,
      replyTo: job.replyToEmail,
      purpose: "email-sequence",
    });

    if (deliveryResult.ok) {
      job.status = "SENT";
      job.sentAt = new Date().toISOString();
      job.provider = deliveryResult.provider;
      job.providerMessageId = deliveryResult.providerMessageId;
      job.lastError = null;

      results.push({
        jobId: job.id,
        status: "sent",
        provider: deliveryResult.provider,
      });
    } else {
      job.status = "FAILED";
      job.failedAt = new Date().toISOString();
      job.provider = deliveryResult.provider;
      job.lastError =
        deliveryResult.error?.message || "Email sequence delivery failed.";

      results.push({
        jobId: job.id,
        status: "failed",
        error: job.lastError,
      });
    }

    job.updatedAt = new Date().toISOString();
  }

  await writeLocalJobs(jobs);

  return {
    processed: results.length,
    results,
    source: "local-fallback",
  };
}

async function stepCanSend(job) {
  if (!job.step.requirePreviousStep || job.step.sortOrder <= 0) {
    return stepConditionsPass(job);
  }

  const previousJobs = await prisma.emailSequenceJob.findMany({
    where: {
      enrollmentId: job.enrollmentId,
      step: {
        sortOrder: {
          lt: job.step.sortOrder,
        },
      },
    },
    include: { step: true },
  });
  const previousJob = previousJobs.sort(
    (left, right) => right.step.sortOrder - left.step.sortOrder
  )[0];

  if (previousJob && previousJob.status !== "SENT") {
    return false;
  }

  return stepConditionsPass(job);
}

async function stepConditionsPass(job) {
  const conditions = Array.isArray(job.step.conditions)
    ? job.step.conditions
    : [];
  const actionableConditions = conditions.filter(
    (condition) => condition.conditionType && condition.conditionType !== "always"
  );

  if (!actionableConditions.length) {
    return true;
  }

  for (const condition of actionableConditions) {
    const referenceKey = condition.referenceKey || condition.value || null;

    if (condition.conditionType === "opened_email") {
      const event = await prisma.emailSequenceEvent.findFirst({
        where: {
          enrollmentId: job.enrollmentId,
          eventType: "opened_email",
          ...(referenceKey ? { eventKey: referenceKey } : {}),
        },
      });

      if (!event) return false;
    }

    if (condition.conditionType === "clicked_link") {
      const event = await prisma.emailSequenceEvent.findFirst({
        where: {
          enrollmentId: job.enrollmentId,
          eventType: {
            in: ["clicked_link", "opened_slide"],
          },
          ...(referenceKey ? { eventKey: referenceKey } : {}),
        },
      });

      if (!event) return false;
    }

    if (condition.conditionType === "did_not_open_email") {
      const event = await prisma.emailSequenceEvent.findFirst({
        where: {
          enrollmentId: job.enrollmentId,
          eventType: "opened_email",
          ...(referenceKey ? { eventKey: referenceKey } : {}),
        },
      });

      if (event) return false;
    }

    if (condition.conditionType === "did_not_click_link") {
      const event = await prisma.emailSequenceEvent.findFirst({
        where: {
          enrollmentId: job.enrollmentId,
          eventType: {
            in: ["clicked_link", "opened_slide"],
          },
          ...(referenceKey ? { eventKey: referenceKey } : {}),
        },
      });

      if (event) return false;
    }
  }

  return true;
}

async function createSequenceEvent({
  sequenceId,
  stepId = null,
  enrollmentId = null,
  jobId = null,
  userId = null,
  recipientEmail = null,
  eventType,
  eventKey = null,
  metadata = null,
}) {
  return prisma.emailSequenceEvent.create({
    data: {
      sequenceId,
      stepId,
      enrollmentId,
      jobId,
      userId,
      recipientEmail,
      eventType,
      eventKey,
      metadata,
    },
  });
}

async function unlockDripSlideForJob(job) {
  const dripUnlock = getDripUnlockFromUrl(job.ctaUrl);

  if (!dripUnlock || !job.userId) {
    return null;
  }

  await createSequenceEvent({
    sequenceId: job.sequenceId,
    stepId: job.stepId,
    enrollmentId: job.enrollmentId,
    jobId: job.id,
    userId: job.userId,
    recipientEmail: job.recipientEmail,
    eventType: "slide_unlocked",
    eventKey: dripUnlock.unlockKey,
    metadata: {
      dripSequenceKey: dripUnlock.dripSequenceKey,
      slideId: dripUnlock.slideId,
      source: "email-sequence-send",
    },
  });

  return dripUnlock;
}

export async function enrollEmailSequencesForTrigger({
  triggerEvent,
  user = null,
  email,
  name = null,
  context = null,
}) {
  try {
    return await enrollDatabaseEmailSequencesForTrigger({
      triggerEvent,
      user,
      email,
      name,
      context,
    });
  } catch (error) {
    console.warn("Email sequence database enrollment failed; using local fallback.", error);

    return enrollLocalEmailSequencesForTrigger({
      triggerEvent,
      user,
      email,
      name,
      context,
    });
  }
}

export async function enrollVerifiedEmailTagSequencesForUser({
  user = null,
  email,
  name = null,
  source = "email-verification",
  context = {},
}) {
  const recipientEmail = normalizeEmail(email || user?.email);

  if (!user?.id || !recipientEmail) {
    return {
      enrolled: 0,
      jobsCreated: 0,
    };
  }

  await ensureItaslLeadNurtureSequence();

  const tags = await prisma.userTag.findMany({
    where: {
      userId: user.id,
    },
    select: {
      tagKey: true,
    },
  });

  let enrolled = 0;
  let jobsCreated = 0;

  for (const tag of tags) {
    const tagKey = String(tag.tagKey || "").trim();

    if (!tagKey) {
      continue;
    }

    const result = await enrollEmailSequencesForTrigger({
      triggerEvent: "tag_added",
      user,
      email: recipientEmail,
      name: name || user.name,
      context: {
        ...context,
        source,
        tagKey,
        emailVerified: true,
      },
    });

    enrolled += Number(result?.enrolled) || 0;
    jobsCreated += Number(result?.jobsCreated) || 0;
  }

  return {
    enrolled,
    jobsCreated,
  };
}

async function enrollDatabaseEmailSequencesForTrigger({
  triggerEvent,
  user = null,
  email,
  name = null,
  context = null,
}) {
  const recipientEmail = normalizeEmail(email || user?.email);

  if (!triggerEvent || !recipientEmail) {
    return {
      enrolled: 0,
      jobsCreated: 0,
    };
  }

  const sequences = await prisma.emailSequence.findMany({
    where: {
      active: true,
      triggerEvent,
    },
    include: {
      steps: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          conditions: true,
        },
      },
    },
  });

  let enrolled = 0;
  let jobsCreated = 0;
  let soonestScheduledFor = null;

  for (const sequence of sequences) {
    if (!sequenceMatchesTriggerContext(sequence, triggerEvent, context)) {
      continue;
    }

    const enrolledAt = new Date();
    const recipientName = name || user?.name || null;
    const enrollment = await prisma.emailSequenceEnrollment.upsert({
      where: {
        sequenceId_recipientEmail: {
          sequenceId: sequence.id,
          recipientEmail,
        },
      },
      create: {
        sequenceId: sequence.id,
        userId: user?.id || null,
        recipientEmail,
        recipientName,
        triggerEvent,
        status: "ACTIVE",
        context,
        enrolledAt,
      },
      update: {
        userId: user?.id || null,
        recipientName,
        triggerEvent,
        status: "ACTIVE",
        context,
      },
    });

    enrolled += 1;

    await createSequenceEvent({
      sequenceId: sequence.id,
      enrollmentId: enrollment.id,
      userId: user?.id || null,
      recipientEmail,
      eventType: "enrolled",
      eventKey: triggerEvent,
      metadata: context,
    });

    const templateContext = buildContext({
      user,
      recipientEmail,
      recipientName,
      context,
    });

    for (const step of sequence.steps) {
      const subject = renderTemplate(step.subject, templateContext);
      const bodyText = renderTemplate(step.bodyText, templateContext);
      const ctaUrl = step.ctaUrl ? renderTemplate(step.ctaUrl, templateContext) : null;
      const ctaLabel = step.ctaLabel
        ? renderTemplate(step.ctaLabel, templateContext)
        : null;

      const job = await prisma.emailSequenceJob.upsert({
        where: {
          enrollmentId_stepId: {
            enrollmentId: enrollment.id,
            stepId: step.id,
          },
        },
        create: {
          sequenceId: sequence.id,
          stepId: step.id,
          enrollmentId: enrollment.id,
          userId: user?.id || null,
          recipientEmail,
          recipientName,
          subject,
          previewText: step.previewText
            ? renderTemplate(step.previewText, templateContext)
            : null,
          fromName: step.fromName,
          fromEmail: step.fromEmail,
          replyToEmail: step.replyToEmail,
          bodyText,
          bodyHtml: buildHtmlFromText(bodyText, ctaLabel, ctaUrl),
          ctaLabel,
          ctaUrl,
          status: "PENDING",
          scheduledFor: getScheduledFor(step, enrolledAt),
          metadata: {
            sequenceKey: sequence.sequenceKey,
            stepKey: step.stepKey,
          },
        },
        update: {},
      });

      if (job.status === "PENDING") {
        jobsCreated += 1;
        soonestScheduledFor =
          !soonestScheduledFor || job.scheduledFor < soonestScheduledFor
            ? job.scheduledFor
            : soonestScheduledFor;
      }
    }
  }

  if (soonestScheduledFor) {
    scheduleDueEmailSequenceRunAt(soonestScheduledFor);
  }

  return {
    enrolled,
    jobsCreated,
  };
}

export async function sendDueEmailSequenceJobs({ limit = MAX_JOBS_PER_RUN } = {}) {
  try {
    return await sendDatabaseDueEmailSequenceJobs({ limit });
  } catch (error) {
    console.warn("Email sequence database runner failed; using local fallback.", error);

    return sendLocalDueEmailSequenceJobs({ limit });
  }
}

export async function scheduleNextDripSequenceJob({
  userId,
  dripSequenceKey,
  currentUnlockKey,
  openedAt = new Date(),
}) {
  if (!userId || !dripSequenceKey || !currentUnlockKey) {
    return null;
  }

  if (dripSequenceKey === "itasl") {
    await ensureItaslLeadNurtureSequence();
  }

  const sequence = await prisma.emailSequence.findFirst({
    where: {
      active: true,
      metadata: {
        path: ["dripSequenceKey"],
        equals: dripSequenceKey,
      },
    },
    include: {
      steps: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!sequence?.steps?.length) {
    return null;
  }

  const currentStep = sequence.steps.find(
    (step) =>
      step.stepKey === currentUnlockKey ||
      step.metadata?.dripUnlockKey === currentUnlockKey ||
      step.metadata?.slideId === currentUnlockKey
  );

  if (!currentStep) {
    return null;
  }

  const nextStep = sequence.steps.find(
    (step) => step.sortOrder > currentStep.sortOrder
  );

  if (!nextStep) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  const recipientEmail = normalizeEmail(user?.email);

  if (!recipientEmail) {
    return null;
  }

  const enrollment =
    (await prisma.emailSequenceEnrollment.findFirst({
    where: {
      sequenceId: sequence.id,
      userId,
      status: "ACTIVE",
    },
    include: {
      user: true,
    },
    orderBy: {
      enrolledAt: "desc",
    },
  })) ||
    (await prisma.emailSequenceEnrollment.upsert({
      where: {
        sequenceId_recipientEmail: {
          sequenceId: sequence.id,
          recipientEmail,
        },
      },
      create: {
        sequenceId: sequence.id,
        userId,
        recipientEmail,
        recipientName: user?.name || null,
        triggerEvent: "drip-preview",
        status: "ACTIVE",
        context: {
          source: "drip-countdown",
        },
      },
      update: {
        userId,
        recipientName: user?.name || null,
        status: "ACTIVE",
      },
      include: {
        user: true,
      },
    }));

  const existingJob = await prisma.emailSequenceJob.findUnique({
    where: {
      enrollmentId_stepId: {
        enrollmentId: enrollment.id,
        stepId: nextStep.id,
      },
    },
    select: {
      id: true,
      status: true,
      scheduledFor: true,
      step: {
        select: {
          stepKey: true,
          name: true,
        },
      },
    },
  });

  if (existingJob) {
    return existingJob;
  }

  const recipientName = enrollment.recipientName || enrollment.user?.name || null;
  const templateContext = buildContext({
    user: enrollment.user,
    recipientEmail,
    recipientName,
    context: enrollment.context,
  });
  const subject = renderTemplate(nextStep.subject, templateContext);
  const bodyText = renderTemplate(nextStep.bodyText, templateContext);
  const ctaUrl = nextStep.ctaUrl
    ? renderTemplate(nextStep.ctaUrl, templateContext)
    : null;
  const ctaLabel = nextStep.ctaLabel
    ? renderTemplate(nextStep.ctaLabel, templateContext)
    : null;
  const scheduledFor = getScheduledFor(nextStep, openedAt);

  const job = await prisma.emailSequenceJob.create({
    data: {
      sequenceId: sequence.id,
      stepId: nextStep.id,
      enrollmentId: enrollment.id,
      userId,
      recipientEmail,
      recipientName,
      subject,
      previewText: nextStep.previewText
        ? renderTemplate(nextStep.previewText, templateContext)
        : null,
      fromName: nextStep.fromName,
      fromEmail: nextStep.fromEmail,
      replyToEmail: nextStep.replyToEmail,
      bodyText,
      bodyHtml: buildHtmlFromText(bodyText, ctaLabel, ctaUrl),
      ctaLabel,
      ctaUrl,
      status: "PENDING",
      scheduledFor,
      metadata: {
        sequenceKey: sequence.sequenceKey,
        stepKey: nextStep.stepKey,
        scheduledAfterUnlockKey: currentUnlockKey,
      },
    },
    select: {
      id: true,
      status: true,
      scheduledFor: true,
      step: {
        select: {
          stepKey: true,
          name: true,
        },
      },
    },
  });

  scheduleDueEmailSequenceRunAt(scheduledFor);

  return job;
}

async function sendDatabaseDueEmailSequenceJobs({ limit = MAX_JOBS_PER_RUN } = {}) {
  const now = new Date();
  const jobs = await prisma.emailSequenceJob.findMany({
    where: {
      status: "PENDING",
      scheduledFor: {
        lte: now,
      },
      sequence: {
        active: true,
      },
      step: {
        active: true,
      },
      enrollment: {
        status: "ACTIVE",
      },
    },
    include: {
      step: {
        include: {
          conditions: true,
        },
      },
      sequence: true,
      enrollment: true,
    },
    orderBy: [{ scheduledFor: "asc" }, { createdAt: "asc" }],
    take: Math.max(1, Math.min(Number(limit) || MAX_JOBS_PER_RUN, 100)),
  });

  const results = [];

  for (const job of jobs) {
    const canSend = await stepCanSend(job);

    if (!canSend) {
      results.push({
        jobId: job.id,
        status: "waiting_for_previous_step",
      });
      continue;
    }

    await prisma.emailSequenceJob.update({
      where: { id: job.id },
      data: {
        status: "SENDING",
        attempts: {
          increment: 1,
        },
      },
    });

    await unlockDripSlideForJob(job);

    const ctaUrl = appendSequenceJobIdToCtaUrl(job.ctaUrl, job.id);
    const bodyHtml = buildHtmlFromText(job.bodyText, job.ctaLabel, ctaUrl);

    const deliveryResult = await sendEmailMessage({
      to: job.recipientEmail,
      subject: job.subject,
      text: job.bodyText,
      html: bodyHtml,
      fromEmail: job.fromEmail,
      fromName: job.fromName,
      replyTo: job.replyToEmail,
      purpose: "email-sequence",
    });

    if (deliveryResult.ok) {
      await prisma.emailSequenceJob.update({
        where: { id: job.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          provider: deliveryResult.provider,
          providerMessageId: deliveryResult.providerMessageId,
          lastError: null,
        },
      });

      await createSequenceEvent({
        sequenceId: job.sequenceId,
        stepId: job.stepId,
        enrollmentId: job.enrollmentId,
        jobId: job.id,
        userId: job.userId,
        recipientEmail: job.recipientEmail,
        eventType: "sent",
        eventKey: job.step.stepKey,
        metadata: {
          provider: deliveryResult.provider,
          providerMessageId: deliveryResult.providerMessageId,
          rewritten: deliveryResult.rewritten,
          to: deliveryResult.to,
          originalTo: deliveryResult.originalTo,
        },
      });

      results.push({
        jobId: job.id,
        status: "sent",
        provider: deliveryResult.provider,
      });
    } else {
      const message =
        deliveryResult.error?.message || "Email sequence delivery failed.";

      await prisma.emailSequenceJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          failedAt: new Date(),
          provider: deliveryResult.provider,
          lastError: message,
        },
      });

      await createSequenceEvent({
        sequenceId: job.sequenceId,
        stepId: job.stepId,
        enrollmentId: job.enrollmentId,
        jobId: job.id,
        userId: job.userId,
        recipientEmail: job.recipientEmail,
        eventType: "failed",
        eventKey: job.step.stepKey,
        metadata: {
          error: deliveryResult.error,
          provider: deliveryResult.provider,
        },
      });

      results.push({
        jobId: job.id,
        status: "failed",
        error: message,
      });
    }
  }

  return {
    processed: results.length,
    results,
  };
}
