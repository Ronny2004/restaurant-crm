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

function escapeHtml(value: string) {
    return value.replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    })[character] || character);
}

type AccessCredentialsEmail = {
    email: string;
    fullName: string;
    username: string;
    password: string;
    pin?: string | null;
    regenerated?: boolean;
};

export async function sendAccessCredentialsEmail(
    input: AccessCredentialsEmail,
) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
        throw new Error("Falta SMTP_FROM o SMTP_USER");
    }

    const title = input.regenerated
        ? "Tus accesos fueron regenerados"
        : "Bienvenido al sistema de Delicias Morán";
    const pinLine = input.pin ? `PIN temporal: ${input.pin}` : null;

    try {
        const info = await createTransport().sendMail({
            from: `Delicias Morán <${from}>`,
            to: input.email,
            subject: title,
            text: [
                `Hola ${input.fullName},`,
                "",
                input.regenerated
                    ? "Un administrador regeneró tus credenciales de acceso."
                    : "Se creó tu cuenta de acceso al sistema interno.",
                "",
                `Usuario: ${input.username}`,
                `Contraseña temporal: ${input.password}`,
                pinLine,
                "",
                "Debes cambiar las credenciales temporales durante tu próximo ingreso.",
                "No compartas este correo ni tus credenciales.",
            ].filter(Boolean).join("\n"),
            html: `
                <div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#172033">
                    <h1 style="font-size:24px">${escapeHtml(title)}</h1>
                    <p>Hola <strong>${escapeHtml(input.fullName)}</strong>,</p>
                    <p>${input.regenerated
                        ? "Un administrador regeneró tus credenciales de acceso."
                        : "Se creó tu cuenta de acceso al sistema interno."}</p>
                    <div style="padding:18px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0">
                        <p><strong>Usuario:</strong> ${escapeHtml(input.username)}</p>
                        <p><strong>Contraseña temporal:</strong> ${escapeHtml(input.password)}</p>
                        ${input.pin ? `<p><strong>PIN temporal:</strong> ${escapeHtml(input.pin)}</p>` : ""}
                    </div>
                    <p>Debes cambiar las credenciales temporales durante tu próximo ingreso.</p>
                    <p style="color:#64748b">No compartas este correo ni tus credenciales.</p>
                </div>
            `,
        });
        console.log("Correo de acceso enviado. ID:", info.messageId);
    } catch (error) {
        console.error("Error enviando credenciales por SMTP:", error);
        throw new Error("No se pudo enviar el correo con las credenciales");
    }
}

export async function sendPinRecoveryEmail(email: string, code: string) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    if (!from) {
        throw new Error("Falta SMTP_FROM o SMTP_USER");
    }

    try {
        const info = await createTransport().sendMail({
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
        console.log("Correo enviado con éxito. ID:", info.messageId);
    } catch (error) {
        // Esto imprimirá el motivo exacto del fallo en los logs de tu servidor
        console.error("Error crítico enviando correo SMTP:", error);
        throw new Error("No se pudo enviar el correo de recuperación.");
    }
}

type CampaignWinnerEmail = {
    email: string;
    fullName: string;
    phone: string;
    reward: string;
};

export async function sendCampaignWinnerEmail(input: CampaignWinnerEmail) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) throw new Error("Falta SMTP_FROM o SMTP_USER");

    const firstName = input.fullName.trim().split(/\s+/)[0] || "Hola";
    const suppliedPhone = input.phone.trim() || "sin número registrado";

    try {
        const info = await createTransport().sendMail({
            from: `Delicias Morán <${from}>`,
            to: input.email,
            replyTo: from,
            subject: `¡${firstName}, tenemos una buena noticia para ti!`,
            text: [
                `Hola ${input.fullName},`,
                "",
                "¡Felicitaciones! Resultaste ganador/a de uno de nuestros sorteos en Delicias Morán.",
                `Tu premio: ${input.reward}`,
                "",
                `Intentamos comunicarnos al número ${suppliedPhone}, que registraste al participar, pero no logramos contactarte.`,
                "Responde directamente a este correo con un número de teléfono o WhatsApp válido y el horario en que podemos localizarte para coordinar la entrega de tu premio.",
                "",
                "Por tu seguridad, Delicias Morán nunca te pedirá pagos, contraseñas ni códigos para entregarte el premio.",
                "",
                "¡Gracias por participar y ser parte de nuestra comunidad!",
                "Equipo de Delicias Morán",
            ].join("\n"),
            html: `
                <div style="margin:auto;max-width:620px;overflow:hidden;border:1px solid #ead8c6;border-radius:20px;background:#fffaf2;font-family:Arial,sans-serif;color:#3d1c10">
                    <div style="padding:28px;background:#5a2511;color:#fff8e7;text-align:center">
                        <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:1.5px">DELICIAS MORÁN</p>
                        <h1 style="margin:0;font-size:28px">¡Tenemos una buena noticia para ti!</h1>
                    </div>
                    <div style="padding:30px">
                        <p>Hola <strong>${escapeHtml(input.fullName)}</strong>,</p>
                        <p>¡Felicitaciones! Resultaste ganador/a de uno de nuestros sorteos.</p>
                        <div style="margin:24px 0;padding:20px;border:1px solid #d89a2b;border-radius:14px;background:#f9e1a8;text-align:center">
                            <span style="font-size:12px;font-weight:800;letter-spacing:1px;color:#8b4217">TU PREMIO</span>
                            <p style="margin:8px 0 0;font-size:20px;font-weight:800">${escapeHtml(input.reward)}</p>
                        </div>
                        <p>Intentamos comunicarnos al número <strong>${escapeHtml(suppliedPhone)}</strong>, que registraste al participar, pero no logramos contactarte.</p>
                        <p><strong>Responde directamente a este correo</strong> con un número de teléfono o WhatsApp válido y el horario en que podemos localizarte para coordinar la entrega.</p>
                        <p style="margin-top:24px;padding:14px;border-radius:10px;background:#f3eee8;color:#6f594c;font-size:13px">Por tu seguridad, Delicias Morán nunca te pedirá pagos, contraseñas ni códigos para entregarte el premio.</p>
                        <p style="margin-top:24px">¡Gracias por participar y ser parte de nuestra comunidad!<br><strong>Equipo de Delicias Morán</strong></p>
                    </div>
                </div>
            `,
        });
        console.log("Correo de ganador enviado. ID:", info.messageId);
    } catch (error) {
        console.error("Error enviando correo al ganador por SMTP:", error);
        throw new Error("No se pudo enviar el correo al ganador");
    }
}
