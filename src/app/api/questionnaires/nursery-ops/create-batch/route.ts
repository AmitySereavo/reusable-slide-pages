import { NextResponse } from "next/server";

function getBatchPrefix(bucketIndex: number) {
  const first = String.fromCharCode(65 + (bucketIndex % 26));
  const second = String.fromCharCode(65 + Math.floor(bucketIndex / 26));
  return `${first}${second}`;
}

function getDateCodeParts(date = new Date()) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${mm}${dd}${yy}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const now = new Date();

    const existingBatchCount = 0;
    const bucketIndex = Math.floor(existingBatchCount / 100);
    const prefix = getBatchPrefix(bucketIndex);
    const dateCode = getDateCodeParts(now);
    const generatedBatchCode = `${prefix}${dateCode}`;

    return NextResponse.json({
      ok: true,
      message: "Nursery batch received.",
      generatedBatchCode,
      received: body,
    });
  } catch (error) {
    console.error("Nursery create-batch route error:", error);

    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 500 }
    );
  }
}