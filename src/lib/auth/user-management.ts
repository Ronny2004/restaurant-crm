import "server-only";

import { randomBytes } from "node:crypto";
import {
    generateAvailablePin,
    markTemporaryPassword,
    setUserPin,
    toCredentialStatus,
} from "@/lib/auth/credentials";
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

export function generateTemporaryPassword() {
    return `Dm7!${randomBytes(12).toString("base64url")}`;
}

function usernameBase(fullName: string) {
    const normalized = fullName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    const base = normalized.length > 1
        ? `${normalized[0]}.${normalized.at(-1)}`
        : normalized[0] || "usuario";
    return base.slice(0, 34);
}

export async function generateAvailableUsername(fullName: string) {
    const admin = createAdminClient();
    const base = usernameBase(fullName);

    for (let suffix = 0; suffix < 100; suffix += 1) {
        const candidate = suffix === 0 ? base : `${base}${suffix + 1}`;
        const { data, error } = await admin
            .from("profiles")
            .select("id")
            .eq("username", candidate)
            .maybeSingle();

        if (error) {
            throw new Error(`No se pudo generar el usuario: ${error.message}`);
        }
        if (!data) return candidate;
    }

    throw new Error("No se pudo generar un nombre de usuario disponible");
}

export async function generateManagedAccess(
    fullName: string,
    role: UserRole,
    userId?: string,
) {
    return {
        username: userId ? null : await generateAvailableUsername(fullName),
        password: generateTemporaryPassword(),
        pin: role === "admin" ? null : await generateAvailablePin(userId),
    };
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


        await markTemporaryPassword(userId, input.role === "admin");

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

export async function rollbackManagedUserCreation(userId: string) {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    if (!error) return;

    await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
    });
    throw new Error(
        `No se pudo revertir la cuenta después del fallo de correo: ${error.message}`,
    );
}

export async function regenerateManagedUserAccess(
    userId: string,
    actorId: string,
) {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (profileError || !profile) {
        throw new Error("Usuario no encontrado");
    }

    if (profile.account_status !== "active") {
        throw new Error("Activa el usuario antes de regenerar su acceso");
    }

    const access = await generateManagedAccess(
        profile.full_name || profile.username,
        profile.role,
        userId,
    );

    const { error: revokeError } = await admin.rpc(
        "revoke_managed_user_sessions",
        { p_user_id: userId, p_actor_id: actorId },
    );
    if (revokeError) {
        throw new Error(`No se pudieron cerrar las sesiones: ${revokeError.message}`);
    }

    const { error: passwordError } = await admin.auth.admin.updateUserById(
        userId,
        { password: access.password },
    );
    if (passwordError) {
        throw new Error(`No se pudo regenerar la contraseña: ${passwordError.message}`);
    }

    if (profile.role !== "admin" && access.pin) {
        await setUserPin(userId, access.pin, true);
    }
    await markTemporaryPassword(userId, profile.role === "admin");

    return {
        profile: profile as AppProfile,
        password: access.password,
        pin: access.pin,
    };
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

type DeleteManagedUserResult = {
    profile: AppProfile;
    summary: Record<string, number>;
};

export async function deleteManagedUser(
    userId: string,
    actorId: string,
): Promise<DeleteManagedUserResult> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("delete_managed_user_admin", {
        p_user_id: userId,
        p_actor_id: actorId,
    });

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(error?.message || "No se pudo eliminar el usuario");
    }

    const result = data as {
        profile?: AppProfile;
        summary?: Record<string, number>;
    };

    if (!result.profile?.id) {
        throw new Error("La base no devolvió el usuario eliminado");
    }

    return {
        profile: result.profile,
        summary: result.summary || {},
    };
}
