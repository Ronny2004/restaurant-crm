import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
    hashSecret,
    keyedLookup,
    normalizePin,
    verifySecret,
} from "@/lib/auth/crypto";
import type { CredentialStatus } from "@/types/auth";

type CredentialRow = {
    user_id: string;
    pin_lookup: string | null;
    pin_hash: string | null;
    pin_changed_at: string | null;
    pin_expires_at: string | null;
    password_changed_at: string | null;
    password_expires_at: string | null;
    must_change_pin: boolean;
    must_change_password: boolean;
    failed_pin_attempts: number;
    pin_locked_until: string | null;
};

function daysRemaining(value: string | null) {
    if (!value) {
        return null;
    }

    return Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
}

export function toCredentialStatus(row: CredentialRow | null): CredentialStatus {
    return {
        pinConfigured: Boolean(row?.pin_hash),
        mustChangePin: row?.must_change_pin ?? true,
        mustChangePassword: row?.must_change_password ?? false,
        pinExpiresAt: row?.pin_expires_at || null,
        passwordExpiresAt: row?.password_expires_at || null,
        pinDaysRemaining: daysRemaining(row?.pin_expires_at || null),
        passwordDaysRemaining: daysRemaining(row?.password_expires_at || null),
    };
}

export async function getCredentials(userId: string) {
    const admin = createAdminClient();
    const { data, error } = await admin
        .from("user_credentials")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        throw new Error(`No se pudieron consultar las credenciales: ${error.message}`);
    }

    return data as CredentialRow | null;
}

export async function setUserPin(
    userId: string,
    rawPin: unknown,
    mustChange = false,
) {
    const pin = normalizePin(rawPin);

    if (!pin) {
        throw new Error("El PIN debe contener exactamente 6 dígitos");
    }

    const admin = createAdminClient();
    const pinLookup = keyedLookup("pin", pin);
    const pinHash = await hashSecret(pin);
    const changedAt = new Date();
    const expiresAt = new Date(changedAt.getTime() + 30 * 86_400_000);

    const { data: owner } = await admin
        .from("user_credentials")
        .select("user_id")
        .eq("pin_lookup", pinLookup)
        .neq("user_id", userId)
        .maybeSingle();

    if (owner) {
        throw new Error("Ese PIN ya está asignado. Elige otro diferente");
    }

    const { error } = await admin
        .from("user_credentials")
        .upsert({
            user_id: userId,
            pin_lookup: pinLookup,
            pin_hash: pinHash,
            pin_changed_at: changedAt.toISOString(),
            pin_expires_at: expiresAt.toISOString(),
            must_change_pin: mustChange,
            failed_pin_attempts: 0,
            pin_locked_until: null,
            updated_at: changedAt.toISOString(),
        }, { onConflict: "user_id" });

    if (error) {
        if (error.code === "23505") {
            throw new Error("Ese PIN ya está asignado. Elige otro diferente");
        }
        throw new Error(`No se pudo guardar el PIN: ${error.message}`);
    }
}

export async function verifyUserPin(rawPin: unknown) {
    const pin = normalizePin(rawPin);
    if (!pin) {
        return null;
    }

    const admin = createAdminClient();
    const pinLookup = keyedLookup("pin", pin);
    const { data, error } = await admin
        .from("user_credentials")
        .select("*")
        .eq("pin_lookup", pinLookup)
        .maybeSingle();

    if (error || !data) {
        return null;
    }

    const credential = data as CredentialRow;
    if (
        credential.pin_locked_until
        && new Date(credential.pin_locked_until).getTime() > Date.now()
    ) {
        return null;
    }

    if (!credential.pin_hash || !(await verifySecret(pin, credential.pin_hash))) {
        return null;
    }

    return credential;
}

export async function markPinLogin(userId: string) {
    const admin = createAdminClient();
    await admin
        .from("user_credentials")
        .update({
            failed_pin_attempts: 0,
            pin_locked_until: null,
            last_pin_login_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
}

export async function markPasswordChanged(userId: string) {
    const admin = createAdminClient();
    const changedAt = new Date();
    const { error } = await admin
        .from("user_credentials")
        .update({
            password_changed_at: changedAt.toISOString(),
            password_expires_at: new Date(
                changedAt.getTime() + 30 * 86_400_000,
            ).toISOString(),
            must_change_password: false,
            updated_at: changedAt.toISOString(),
        })
        .eq("user_id", userId);

    if (error) {
        throw new Error(`No se pudo actualizar la política: ${error.message}`);
    }
}
