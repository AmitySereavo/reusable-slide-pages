import { AUTH_MESSAGES } from "@/customerAccess/config/authMessages";

const buckets = new Map();

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function normalizeRateLimitKeyPart(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function getRateLimitKey(request, scope, identifier = "") {
  const ip = getClientIp(request);
  const normalizedIdentifier = normalizeRateLimitKeyPart(identifier);

  return `${scope}:${ip}:${normalizedIdentifier}`;
}

export function checkRateLimit({ key, limit, windowSeconds }) {
  const now = Date.now();
  const windowMs = Math.max(1, Number(windowSeconds) || 60) * 1000;
  const maxAttempts = Math.max(1, Number(limit) || 5);
  const existing = buckets.get(key);

  if (!existing || existing.expiresAt <= now) {
    buckets.set(key, {
      count: 1,
      expiresAt: now + windowMs,
    });

    return {
      ok: true,
      remaining: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxAttempts) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.expiresAt - now) / 1000),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    ok: true,
    remaining: Math.max(0, maxAttempts - existing.count),
    retryAfterSeconds: 0,
  };
}

export function rateLimitResponse(result) {
  return Response.json(
    {
      error: AUTH_MESSAGES?.common?.tooManyRequests || "Too many requests.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}