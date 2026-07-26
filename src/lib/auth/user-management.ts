import "server-only";

import { setUserPin, toCredentialStatus } from "@/lib/auth/credentials";
import { createAdminClient } from "@/lib/supabase/admin";
import {
    ACCOUNT_STATUSES,
    USER_ROLES,
    type AccountStatus,
    type AppProfile,
    type ManagedUser,
    type UserRole,
} from "@/types/auth";

export function isUserRole(value: unknown): value is UserRole {
    return typeof value === "string"
        && USER_ROLES.includes(value as UserRole);
}

export function isAccountStatus(value: unknown): value is AccountStatus {
    return typeof value === "string"
        && ACCOUNT_STATUSES.includes(value as AccountStatus);
}

export function isStrongPassword(value: unknown): value is string {
    return typeof value === "string"
        && value.length >= 10
        && value.length <= 128
        && /[a-z]/.test(value)
        && /[A-Z]/.test(value)
        && /\d/.test(value);
}

export function isEmail(value: unknown): value is string {
    return typeof value === "string"
        && value.length <= 254
        && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizeUsername(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }
    const username = value.trim().toLowerCase();
    return /^[a-z0-9._-]{3,40}$/.test(username) ? username : null;
}

export async function listManagedUsers(search?: string) {
    const admin = createAdminClient();
    const [{ data: profiles, error }, { data: credentials, error: credentialsError }] =
        await Promise.all([
            admin.from("profiles").select("*").order("created_at", {
                ascending: false,
            }).limit(500),
            admin.from("user_credentials").select("*"),
        ]);

    if (error || credentialsError) {
        throw new Error(
            `No se pudieron consultar los usuarios: ${
                error?.message || credentialsError?.message
            }`,
        );
    }

    const credentialsByUser = new Map(
        (credentials || []).map((row) => [row.user_id, row]),
    );
    const term = search?.trim().toLowerCase();

    return (profiles as AppProfile[])
        .filter((profile) => {
            if (!term) {
                return true;
            }
            return [
                profile.full_name,
                profile.username,
                profile.email,
                profile.role,
                profile.account_status,
            ].some((value) => value?.toLowerCase().includes(term));
        })
        .map((profile): ManagedUser => ({
            ...profile,
            credentials: toCredentialStatus(
                credentialsByUser.get(profile.id) || null,
            ),
        }));
}

type CreateUserInput = {
    email: string;
    username: string;
    fullName: string;
    role: UserRole;
    password: string;
    pin?: string | null;
    actorId: string;
};

export async function createManagedUser(input: CreateUserInput) {
    const admin = createAdminClient();
    const email = input.email.trim().toLowerCase();
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
            username: input.username,
            full_name: input.fullName,
            created_by: input.actorId,
        },
        app_metadata: {
            created_by: input.actorId,
        },
    });

    if (error || !data.user) {
        throw new Error(error?.message || "No se pudo crear el usuario");
    }

    const userId = data.user.id;

    try {
        if (input.role !== "admin") {
            await setUserPin(userId, input.pin, true);
        }

        const now = new Date().toISOString();
        const { data: profile, error: profileError } = await admin
            .from("profiles")
            .update({
                email,
                username: input.username,
                full_name: input.fullName,
                role: input.role,
                account_status: "active",
                activated_at: now,
                activated_by: input.actorId,
                deactivated_at: null,
                deactivated_by: null,
                deactivation_reason: null,
                updated_at: now,
            })
            .eq("id", userId)
            .select("*")
            .single();

        if (profileError || !profile) {
            throw new Error(
                profileError?.message || "No se pudo completar el perfil",
            );
        }

        return profile as AppProfile;
    } catch (provisioningError) {
        // La cuenta aún no fue entregada. Una creación fallida se revierte para
        // no dejar Auth, profiles y credenciales parcialmente aprovisionados.
        const { error: rollbackError } = await admin.auth.admin.deleteUser(
            userId,
            false,
        );
        if (rollbackError) {
            await admin.auth.admin.updateUserById(userId, {
                ban_duration: "876000h",
            });
            throw new Error(
                `${
                    provisioningError instanceof Error
                        ? provisioningError.message
                        : "Falló el aprovisionamiento"
                }. La cuenta incompleta quedó bloqueada porque no pudo revertirse: ${rollbackError.message}`,
            );
        }
        throw provisioningError;
    }
}

type UpdateUserInput = {
    fullName: string;
    username: string;
    role: UserRole;
    phone?: string | null;
};

export async function updateManagedUser(
    userId: string,
    input: UpdateUserInput,
) {
    const admin = createAdminClient();
    const { data: oldProfile, error: oldError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (oldError || !oldProfile) {
        throw new Error("Usuario no encontrado");
    }

    const { data, error } = await admin
        .from("profiles")
        .update({
            full_name: input.fullName,
            username: input.username,
            role: input.role,
            phone: input.phone || null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("*")
        .single();

    if (error || !data) {
        throw new Error(error?.message || "No se pudo actualizar el usuario");
    }

    return {
        oldProfile: oldProfile as AppProfile,
        profile: data as AppProfile,
    };
}

export async function changeManagedUserEmail(
    userId: string,
    newEmail: string,
) {
    const admin = createAdminClient();
    const { data: oldProfile, error: profileError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (profileError || !oldProfile) {
        throw new Error("Usuario no encontrado");
    }

    const email = newEmail.trim().toLowerCase();
    const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
    });

    if (error) {
        throw new Error(error.message);
    }

    return { oldProfile: oldProfile as AppProfile, email };
}

export async function changeManagedUserStatus(
    userId: string,
    status: "active" | "disabled",
    actorId: string,
    reason?: string | null,
) {
    const admin = createAdminClient();
    const { data: oldProfile, error: profileError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (profileError || !oldProfile) {
        throw new Error("Usuario no encontrado");
    }

    const now = new Date().toISOString();

    if (status === "disabled") {
        const { error: profileUpdateError } = await admin
            .from("profiles")
            .update({
                account_status: "disabled",
                deactivated_at: now,
                deactivated_by: actorId,
                deactivation_reason: reason || null,
                updated_at: now,
            })
            .eq("id", userId);

        if (profileUpdateError) {
            throw new Error(profileUpdateError.message);
        }

        const { error: banError } = await admin.auth.admin.updateUserById(
            userId,
            { ban_duration: "876000h" },
        );
        if (banError) {
            await admin
                .from("profiles")
                .update({
                    account_status: oldProfile.account_status,
                    activated_at: oldProfile.activated_at,
                    activated_by: oldProfile.activated_by,
                    deactivated_at: oldProfile.deactivated_at,
                    deactivated_by: oldProfile.deactivated_by,
                    deactivation_reason: oldProfile.deactivation_reason,
                    updated_at: oldProfile.updated_at,
                })
                .eq("id", userId);
            throw new Error(
                `La cuenta quedó bloqueada en la aplicación, pero falló el bloqueo en Auth: ${banError.message}`,
            );
        }
    } else {
        const { error: unbanError } = await admin.auth.admin.updateUserById(
            userId,
            { ban_duration: "none" },
        );
        if (unbanError) {
            throw new Error(unbanError.message);
        }

        const { error: profileUpdateError } = await admin
            .from("profiles")
            .update({
                account_status: "active",
                activated_at: now,
                activated_by: actorId,
                deactivated_at: null,
                deactivated_by: null,
                deactivation_reason: null,
                updated_at: now,
            })
            .eq("id", userId);

        if (profileUpdateError) {
            // Auth se habilitó primero; si profiles falla, se vuelve a bloquear
            // para que nunca quede una identidad activa con perfil desactivado.
            await admin.auth.admin.updateUserById(userId, {
                ban_duration: "876000h",
            });
            throw new Error(profileUpdateError.message);
        }
    }

    const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error || !data) {
        throw new Error("No se pudo leer el estado actualizado");
    }

    return {
        oldProfile: oldProfile as AppProfile,
        profile: data as AppProfile,
    };
}
