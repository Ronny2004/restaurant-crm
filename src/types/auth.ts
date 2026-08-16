export const USER_ROLES = ["admin", "waiter", "chef", "cashier"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_STATUSES = ["provisioning", "active", "disabled"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type AppProfile = {
    id: string;
    email: string;
    role: UserRole;
    full_name: string | null;
    username: string;
    phone: string | null;
    gender: string | null;
    birth_date: string | null;
    avatar_url: string | null;
    account_status: AccountStatus;
    activated_at: string | null;
    deactivated_at: string | null;
    deactivation_reason: string | null;
    created_at: string;
    updated_at: string;
};

export type CredentialStatus = {
    pinConfigured: boolean;
    passwordConfigured: boolean;
    mustChangePin: boolean;
    mustChangePassword: boolean;
    pinExpiresAt: string | null;
    passwordExpiresAt: string | null;
    pinDaysRemaining: number | null;
    passwordDaysRemaining: number | null;
};

export type ManagedUser = AppProfile & {
    credentials: CredentialStatus;
};

export type AuthApiResponse = {
    ok: boolean;
    message?: string;
    next?: string;
    challengeRequired?: "pin" | "password";
    credentialStatus?: CredentialStatus;
};
