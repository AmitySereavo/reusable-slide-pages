import { prisma } from "@/lib/prisma";

export async function createVerificationDeliveryAttempt({
  identifier,
  delivery,
  target = null,
  successRedirect = null,
  verificationCodeId = null,
  verificationTokenId = null,
  result,
  contextMetadata = null,
}) {
  try {
    await prisma.verificationDeliveryAttempt.create({
      data: {
        purpose: "verification",
        deliveryType: delivery,
        channel: result.channel,
        provider: result.provider,
        mode: result.mode,
        identifier,
        destination: result.to || identifier,
        to: result.to,
        originalTo: result.originalTo,
        rewritten: Boolean(result.rewritten),
        target,
        ok: Boolean(result.ok),
        status: result.status,
        providerMessageId: result.providerMessageId || null,
        errorCode: result.error?.code || null,
        errorMessage: result.error?.message || null,
        errorType: result.error?.category || null,
        metadata: {
          ...(contextMetadata && typeof contextMetadata === "object"
            ? contextMetadata
            : {}),
          successRedirect,
          verificationCodeId,
          verificationTokenId,
        },
      },
    });
  } catch (error) {
    console.error("VERIFICATION DELIVERY AUDIT LOG ERROR:", error);
  }
}

export async function updateVerificationDeliveryAttemptByProviderMessageId({
  providerMessageId,
  status,
  ok = null,
  errorCode = null,
  errorMessage = null,
  errorCategory = null,
  metadataPatch = null,
}) {
  if (!providerMessageId) return null;

  try {
    const existing = await prisma.verificationDeliveryAttempt.findFirst({
      where: { providerMessageId },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      return null;
    }

    const mergedMetadata =
      metadataPatch && existing.metadata && typeof existing.metadata === "object"
        ? {
            ...existing.metadata,
            ...metadataPatch,
          }
        : metadataPatch || existing.metadata || null;

    return await prisma.verificationDeliveryAttempt.update({
      where: { id: existing.id },
      data: {
        status: status ?? existing.status,
        ok: ok ?? existing.ok,
        errorCode: errorCode ?? existing.errorCode,
        errorMessage: errorMessage ?? existing.errorMessage,
        errorType: errorCategory ?? existing.errorType,
        metadata: mergedMetadata,
      },
    });
  } catch (error) {
    console.error("VERIFICATION DELIVERY AUDIT UPDATE ERROR:", error);
    return null;
  }
}