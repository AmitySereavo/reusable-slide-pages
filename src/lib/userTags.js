import { enrollEmailSequencesForTrigger } from "@/lib/verification/emailSequences";

export const ITASL_LEAD_TAG = "itasl-lead";

export function normalizeUserTagKey(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeUserTagKeys(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return [
    ...new Set(
      input.map(normalizeUserTagKey).filter((tagKey) => tagKey.length > 0)
    ),
  ];
}

export async function upsertUserTag(tx, { userId, tagKey, source, metadata }) {
  const normalizedTagKey = normalizeUserTagKey(tagKey);

  if (!userId || !normalizedTagKey) {
    return null;
  }

  return tx.userTag.upsert({
    where: {
      userId_tagKey: {
        userId,
        tagKey: normalizedTagKey,
      },
    },
    create: {
      userId,
      tagKey: normalizedTagKey,
      label: normalizedTagKey,
      source: String(source || "system").trim() || "system",
      metadata: metadata || {},
    },
    update: {
      source: String(source || "system").trim() || "system",
      metadata: metadata || {},
    },
  });
}

export async function enrollTagSequencesForUser({
  user,
  email,
  name,
  tagKey,
  source,
  context = {},
}) {
  const normalizedTagKey = normalizeUserTagKey(tagKey);
  const recipientEmail = String(email || user?.email || "").trim().toLowerCase();

  if (!user?.id || !recipientEmail || !normalizedTagKey) {
    return null;
  }

  return enrollEmailSequencesForTrigger({
    triggerEvent: "tag_added",
    user,
    email: recipientEmail,
    name: name || user.name,
    context: {
      ...context,
      source,
      tagKey: normalizedTagKey,
    },
  });
}

export async function tagUserAndEnrollSequences({
  tx,
  user,
  tagKey,
  source,
  metadata = {},
  enroll = true,
  email,
  name,
  context = {},
}) {
  if (!tx || !user?.id) {
    return null;
  }

  const normalizedTagKey = normalizeUserTagKey(tagKey);

  if (!normalizedTagKey) {
    return null;
  }

  await upsertUserTag(tx, {
    userId: user.id,
    tagKey: normalizedTagKey,
    source,
    metadata,
  });

  if (!enroll) {
    return { tagKey: normalizedTagKey, enrolled: false };
  }

  try {
    const enrollment = await enrollTagSequencesForUser({
      user,
      email,
      name,
      tagKey: normalizedTagKey,
      source,
      context: {
        ...context,
        tagKey: normalizedTagKey,
      },
    });

    return { tagKey: normalizedTagKey, enrolled: true, enrollment };
  } catch (error) {
    console.error("USER TAG SEQUENCE ENROLLMENT ERROR:", error);
    return { tagKey: normalizedTagKey, enrolled: false, error };
  }
}
