import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";

export function LoginShell({
    title,
    description,
    children,
    backHref,
    backLabel = "Volver",
    brandIconSrc = "/assets/logo.webp",
    brandIconAlt = "Logo de Delicias Morán",
    sideContent,
    cardClassName = "",
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    backHref?: string;
    backLabel?: string;
    brandIconSrc?: string;
    brandIconAlt?: string;
    sideContent?: React.ReactNode;
    cardClassName?: string;
}) {
    return (
        <main className="auth-shell">
            <div className={`auth-stage${sideContent ? " auth-stage-with-side" : ""}`}>
                <section className={`glass-panel auth-card ${cardClassName}`.trim()}>
                    <div className="auth-brand">
                        <span className={`auth-brand-icon${brandIconSrc ? " auth-brand-logo" : ""}`}>
                            {brandIconSrc ? (
                                <Image
                                    src={brandIconSrc}
                                    alt={brandIconAlt}
                                    width={58}
                                    height={58}
                                    priority
                                />
                            ) : (
                                <ShieldCheck size={34} />
                            )}
                        </span>
                        <div>
                            <p className="auth-eyebrow">Delicias Morán</p>
                            <h1>{title}</h1>
                        </div>
                    </div>
                    <p className="auth-description">{description}</p>
                    {sideContent && (
                        <div className="auth-mobile-side">
                            {sideContent}
                        </div>
                    )}
                    {children}
                    {backHref && (
                        <Link className="auth-link auth-back" href={backHref}>
                            {backLabel}
                        </Link>
                    )}
                </section>
                {sideContent && (
                    <aside className="glass-panel auth-side-panel auth-desktop-side">
                        {sideContent}
                    </aside>
                )}
            </div>
        </main>
    );
}
