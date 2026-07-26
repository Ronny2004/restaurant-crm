import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function LoginShell({
    title,
    description,
    children,
    backHref,
    backLabel = "Volver",
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    backHref?: string;
    backLabel?: string;
}) {
    return (
        <main className="auth-shell">
            <section className="glass-panel auth-card">
                <div className="auth-brand">
                    <span className="auth-brand-icon">
                        <ShieldCheck size={34} />
                    </span>
                    <div>
                        <p className="auth-eyebrow">Delicias Morán</p>
                        <h1>{title}</h1>
                    </div>
                </div>
                <p className="auth-description">{description}</p>
                {children}
                {backHref && (
                    <Link className="auth-link auth-back" href={backHref}>
                        {backLabel}
                    </Link>
                )}
            </section>
        </main>
    );
}
