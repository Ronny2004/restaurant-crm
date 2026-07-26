"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { CredentialStatus } from "@/types/auth";

export function CredentialExpiryBanner({ isAdmin }: { isAdmin: boolean }) {
    const [status, setStatus] = useState<CredentialStatus | null>(null);

    useEffect(() => {
        if (isAdmin) return;

        fetch("/api/account/security-status", { cache: "no-store" })
            .then((response) => response.json())
            .then((data) => {
                if (data.ok) setStatus(data.credentialStatus);
            })
            .catch(() => undefined);
    }, [isAdmin]);

    if (isAdmin || !status) return null;

    const warnings: string[] = [];
    if (!status.pinConfigured) {
        warnings.push("Aún no tienes un PIN configurado");
    } else if (
        status.pinDaysRemaining !== null
        && status.pinDaysRemaining <= 5
    ) {
        warnings.push(
            status.pinDaysRemaining <= 0
                ? "Tu PIN expiró"
                : `Tu PIN expirará en ${status.pinDaysRemaining} día${
                    status.pinDaysRemaining === 1 ? "" : "s"
                }`,
        );
    }
    if (
        status.passwordDaysRemaining !== null
        && status.passwordDaysRemaining <= 5
    ) {
        warnings.push(
            status.passwordDaysRemaining <= 0
                ? "Tu contraseña expiró"
                : `Tu contraseña expirará en ${status.passwordDaysRemaining} día${
                    status.passwordDaysRemaining === 1 ? "" : "s"
                }`,
        );
    }

    if (!warnings.length) return null;

    return (
        <div className="credential-banner">
            <AlertTriangle size={20} />
            <span>{warnings.join(". ")}.</span>
            <Link href="/perfil/seguridad">Cambiar credenciales</Link>
        </div>
    );
}
