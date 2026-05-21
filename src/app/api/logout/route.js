import { logoutCurrentSession } from "@/lib/auth/sessionServer";

export async function POST() {
  try {
    await logoutCurrentSession();

    return Response.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);

    return Response.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}