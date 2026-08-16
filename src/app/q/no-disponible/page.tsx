import Image from "next/image";
import Link from "next/link";
import { Clock3 } from "lucide-react";

export default function QrUnavailablePage() {
    return (
        <main className="qr-unavailable-page">
            <section className="qr-unavailable-card">
                <Image
                    src="/assets/logo.webp"
                    alt="Delicias Morán"
                    width={96}
                    height={96}
                    priority
                />
                <Clock3 size={42} />
                <p className="campaign-brand-kicker">Delicias Morán</p>
                <h1>Este contenido está descansando</h1>
                <p>
                    Muy pronto encontrarás una nueva experiencia preparada para ti.
                </p>
                <Link className="btn btn-primary" href="https://deliciasmoran.vercel.app/">
                    Visitar nuestro sitio
                </Link>
            </section>
        </main>
    );
}
