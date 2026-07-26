import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { RequestContext } from "@/lib/auth/request-context";

type AuthEvent = {
    userId?: string | null;
    eventType:
        | "login_success"
        | "login_failed"
        | "logout"
        | "pin_recovery_requested"
        | "pin_recovery_sent"
        | "pin_recovery_failed"
        | "pin_changed"
        | "password_changed"
        | "account_locked"
        | "emergency_code_created"
        | "emergency_code_used";
    authMethod?:
        | "pin"
        | "password"
        | "admin_password"
        | "recovery_pin"
        | "emergency_code"
        | null;
    success: boolean;
    failureCode?: string | null;
    metadata?: Record<string, unknown>;
};

export async function recordAuthEvent(
    context: RequestContext,
    event: AuthEvent,
) {
    const admin = createAdminClient();
    const { error } = await admin.from("authentication_events").insert({
        user_id: event.userId || null,
        event_type: event.eventType,
        auth_method: event.authMethod || null,
        success: event.success,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        country_code: context.countryCode,
        region: context.region,
        city: context.city,
        location_source: context.countryCode ? "ip_geo" : "unavailable",
        failure_code: event.failureCode || null,
        request_id: context.requestId,
        metadata: event.metadata || {},
    });

    if (error) {
        console.error("No se pudo registrar el evento de autenticación", error.message);
    }
}

type ManagementAudit = {
    action:
        | "created"
        | "updated"
        | "activated"
        | "deactivated"
        | "role_changed"
        | "email_changed"
        | "emergency_code_created";
    actor: {
        id: string;
        username: string;
        role: string;
    };
    target: {
        id: string;
        email?: string | null;
        username?: string | null;
    };
    changedFields?: string[];
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
};

export async function recordManagementAudit(
    context: RequestContext,
    entry: ManagementAudit,
) {
    const admin = createAdminClient();
    const { error } = await admin.from("user_management_audit").insert({
        action: entry.action,
        actor_user_id: entry.actor.id,
        actor_username: entry.actor.username,
        actor_role: entry.actor.role,
        target_user_id: entry.target.id,
        target_email: entry.target.email || null,
        target_username: entry.target.username || null,
        changed_fields: entry.changedFields || [],
        old_data: entry.oldData || null,
        new_data: entry.newData || null,
        source: "admin_api",
        request_id: context.requestId,
        ip_address: context.ipAddress,
        user_agent: context.userAgent,
        reason: entry.reason || null,
        metadata: entry.metadata || {},
    });

    if (error) {
        // El trigger de profiles conserva el cambio de forma atómica. Este
        // registro complementario agrega IP, agente y request_id, pero su fallo
        // no debe convertir una operación ya confirmada en un falso error.
        console.error("No se pudo enriquecer la auditoría", error.message);
        return false;
    }

    return true;
}
