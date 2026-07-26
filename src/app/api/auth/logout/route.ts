import { NextResponse, type NextRequest } from "next/server";
import { recordAuthEvent } from "@/lib/auth/audit";
import { getCurrentProfile } from "@/lib/auth/authorization";
import { getRequestContext } from "@/lib/auth/request-context";
import { clearServerSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
    const context = getRequestContext(request);
    const profile = await getCurrentProfile();
    await clearServerSession();

    if (profile) {
        await recordAuthEvent(context, {
            userId: profile.id,
            eventType: "logout",
            success: true,
        });
    }

    return NextResponse.json({ ok: true });
}
