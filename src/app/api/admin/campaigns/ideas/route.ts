import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, safeJson } from "@/lib/auth/responses";

export const runtime = "nodejs";

const FREE_OPENROUTER_MODEL = "openrouter/free";

type CampaignIdea = {
    title: string;
    description: string;
    reward: string;
    rationale: string;
};

const FORBIDDEN_PUBLIC_LANGUAGE =
    /\b(datos?|base de datos|an[aá]lisis|expansi[oó]n|ampliar|crecimiento|ventas?|vender|negocio|estudio de mercado|investigaci[oó]n|compra m[ií]nima|acumula(?:r)? puntos)\b/i;

function clean(value: unknown, maxLength: number) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isCampaignIdea(value: unknown): value is CampaignIdea {
    if (!value || typeof value !== "object") {
        return false;
    }
    const idea = value as Partial<CampaignIdea>;
    const publicCopy = [
        idea.title,
        idea.description,
        idea.reward,
    ].filter((part): part is string => typeof part === "string").join(" ");

    return (
        typeof idea.title === "string"
        && idea.title.length >= 3
        && typeof idea.description === "string"
        && idea.description.length >= 3
        && typeof idea.reward === "string"
        && idea.reward.length >= 2
        && typeof idea.rationale === "string"
        && !FORBIDDEN_PUBLIC_LANGUAGE.test(publicCopy)
    );
}

export async function POST(request: NextRequest) {
    const actor = await requireActiveProfile(["admin"]);
    if (!actor) {
        return jsonError("No autorizado", 401);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return jsonError(
            "El asistente todavía no está configurado. Agrega OPENROUTER_API_KEY.",
            503,
        );
    }

    const body = await safeJson(request);
    const objective = clean(body?.objective, 600);
    const audience = clean(body?.audience, 160);
    const extraContext = clean(body?.extraContext, 500);
    if (objective.length > 0 && objective.length < 10) {
        return jsonError(
            "Si agregas un enfoque, descríbelo en al menos 10 caracteres",
        );
    }

    const limit = await consumeRateLimit(
        "campaign-ai-assistant",
        actor.id,
        { maxAttempts: 20, windowSeconds: 3600, blockSeconds: 900 },
    );
    if (!limit.allowed) {
        return jsonError(
            "Alcanzaste el límite temporal del asistente. Intenta más tarde.",
            429,
        );
    }

    const model = FREE_OPENROUTER_MODEL;
    const prompt = [
        objective ? `Enfoque adicional del administrador: ${objective}` : "",
        audience ? `Público deseado: ${audience}` : "",
        extraContext ? `Contexto adicional: ${extraContext}` : "",
    ].filter(Boolean).join("\n");

    try {
        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": request.nextUrl.origin,
                    "X-OpenRouter-Title": "Delicias Morán CRM",
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.85,
                    max_tokens: 1200,
                    messages: [
                        {
                            role: "system",
                            content:
                                `Eres el estratega senior de marketing de Delicias Morán, un restaurante ecuatoriano de barrio en Quito.

OBJETIVO INTERNO, SOLO PARA TU RAZONAMIENTO:
- Crear campañas que permitan conocer preferencias de platos, sector de procedencia, sugerencias y canales de contacto.
- Esa información servirá internamente para promociones relevantes, decisiones comerciales y análisis de posibles zonas de crecimiento.
- El formulario siempre recopila: nombre, correo, teléfono, plato favorito, sector donde vive y sugerencias.
- No propongas obtener datos que el formulario no pregunta. La concurrencia por día se analiza con las ventas del sistema, no con esta campaña.

REGLAS OBLIGATORIAS PARA EL TEXTO QUE VERÁ EL CLIENTE:
- El cliente debe sentirse escuchado, importante y beneficiado.
- Nunca menciones recopilación de datos, base de datos, análisis, expansión, crecimiento del negocio, aumentar ventas, vender más ni objetivos internos.
- La mecánica siempre es completar el formulario y participar en un sorteo. No inventes rangos de fechas, etapas, cupones condicionados, programas de puntos ni dinámicas adicionales.
- Presenta la participación como una oportunidad sencilla de compartir sus gustos y ganar.
- Usa lenguaje humano, cálido, convincente y natural para clientes ecuatorianos.
- Evita frases corporativas, genéricas o manipuladoras.
- Los premios deben ser realistas para un restaurante de barrio y quedar descritos claramente.

ENTREGA:
- Propón exactamente tres campañas diferentes.
- title, description y reward son textos públicos dirigidos al cliente y deben cumplir todas las reglas.
- rationale es una explicación privada para el administrador: indica qué información útil obtendrá y cómo podría aprovecharla, sin confundirla con el texto público.
- Responde únicamente con el JSON solicitado y en español de Ecuador.`,
                        },
                        {
                            role: "user",
                            content: `Genera tres ideas de sorteo enfocadas en hacer sentir valorado al cliente de Delicias Morán.${prompt ? `\n${prompt}` : ""}`,
                        },
                    ],
                    response_format: {
                        type: "json_schema",
                        json_schema: {
                            name: "campaign_ideas",
                            strict: true,
                            schema: {
                                type: "object",
                                properties: {
                                    ideas: {
                                        type: "array",
                                        minItems: 3,
                                        maxItems: 3,
                                        items: {
                                            type: "object",
                                            properties: {
                                                title: { type: "string", maxLength: 120 },
                                                description: { type: "string", maxLength: 700 },
                                                reward: { type: "string", maxLength: 220 },
                                                rationale: { type: "string", maxLength: 300 },
                                            },
                                            required: [
                                                "title",
                                                "description",
                                                "reward",
                                                "rationale",
                                            ],
                                            additionalProperties: false,
                                        },
                                    },
                                },
                                required: ["ideas"],
                                additionalProperties: false,
                            },
                        },
                    },
                    provider: { require_parameters: true },
                }),
                signal: AbortSignal.timeout(45_000),
            },
        );

        const payload = await response.json() as {
            error?: { message?: string };
            model?: string;
            choices?: Array<{ message?: { content?: string } }>;
        };
        if (!response.ok) {
            throw new Error(payload.error?.message || "OpenRouter rechazó la solicitud");
        }

        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error("El asistente no devolvió contenido");
        }

        const parsed = JSON.parse(content) as { ideas?: unknown[] };
        const ideas = (parsed.ideas || []).filter(isCampaignIdea).slice(0, 3);
        if (ideas.length !== 3) {
            throw new Error("El asistente devolvió una respuesta incompleta");
        }

        return NextResponse.json({
            ok: true,
            ideas,
            model: payload.model || model,
        });
    } catch (error) {
        console.error(
            "Error del asistente de campañas",
            error instanceof Error ? error.message : error,
        );
        return jsonError(
            "No pudimos generar ideas en este momento. Intenta nuevamente.",
            502,
        );
    }
}
