import "server-only";

import nodemailer from "nodemailer";

function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_APP_PASSWORD;

    if (!host || !Number.isFinite(port)) {
        throw new Error("Falta la configuración SMTP");
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
    });
}

export async function sendPinRecoveryEmail(email: string, code: string) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!from) {
        throw new Error("Falta SMTP_FROM o SMTP_USER");
    }

    await createTransport().sendMail({
        from: `Delicias Morán <${from}>`,
        to: email,
        subject: "Tu PIN temporal de acceso",
        text: [
            "Solicitaste recuperar tu acceso a Delicias Morán.",
            "",
            `Tu PIN temporal es: ${code}`,
            "",
            "Este código expira en 5 minutos y solo puede utilizarse una vez.",
            "Si no realizaste esta solicitud, ignora este mensaje.",
        ].join("\n"),
        html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
                <h1 style="font-size:22px">Recuperación de acceso</h1>
                <p>Solicitaste recuperar tu acceso a Delicias Morán.</p>
                <p style="font-size:32px;font-weight:700;letter-spacing:8px">${code}</p>
                <p>Este PIN expira en <strong>5 minutos</strong> y solo puede utilizarse una vez.</p>
                <p style="color:#64748b">Si no realizaste esta solicitud, ignora este mensaje.</p>
            </div>
        `,
    });
}
