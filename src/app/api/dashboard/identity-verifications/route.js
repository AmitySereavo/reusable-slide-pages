import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSessionJson } from "@/lib/auth/adminGuard";

function serialize(record) {
  return {
    id: record.id,
    userId: record.userId,
    userName: record.user?.name || "Unnamed account",
    userEmail: record.user?.email || null,
    documentType: record.documentType,
    instagramUrl: record.instagramUrl,
    tiktokUrl: record.tiktokUrl,
    facebookUrl: record.facebookUrl,
    status: record.status,
    adminNotes: record.adminNotes,
    submittedAt: record.submittedAt?.toISOString?.() ?? record.submittedAt,
    reviewedAt: record.reviewedAt?.toISOString?.() ?? record.reviewedAt,
    frontFileUrl: `/api/account/identity-verification/file?id=${encodeURIComponent(
      record.id
    )}&side=front`,
    backFileUrl: `/api/account/identity-verification/file?id=${encodeURIComponent(
      record.id
    )}&side=back`,
  };
}

export async function GET(request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return NextResponse.json({
      verifications: [],
      notice: "Identity verification storage is not available until Prisma is refreshed.",
    });
  }

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "").trim().toUpperCase();
  const where = status && status !== "ALL" ? { status } : {};

  const verifications = await prisma.userIdentityVerification.findMany({
    where,
    take: 100,
    orderBy: [{ status: "asc" }, { submittedAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    verifications: verifications.map(serialize),
  });
}

export async function PATCH(request) {
  const guard = await requireAdminSessionJson();
  if (guard.response) return guard.response;

  if (!("userIdentityVerification" in prisma) || !prisma.userIdentityVerification) {
    return NextResponse.json(
      { error: "Identity verification storage is not available." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "").trim();
  const status = String(body?.status || "").trim().toUpperCase();
  const adminNotes = String(body?.adminNotes || "").trim() || null;

  if (!id || !["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json(
      { error: "A verification id and valid status are required." },
      { status: 400 }
    );
  }

  const verification = await prisma.userIdentityVerification.update({
    where: { id },
    data: {
      status,
      adminNotes,
      reviewedByUserId: guard.session.userId,
      reviewedAt: status === "PENDING" ? null : new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, verification: serialize(verification) });
}
