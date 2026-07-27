import { NextResponse, type NextRequest } from "next/server";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { jsonError, safeJson } from "@/lib/auth/responses";

export const runtime = "nodejs";

const FREE_OPENROUTER_MODEL = "openrouter/free";
const MAX_GENERATION_ATTEMPTS = 2;

type CampaignIdea = {
    title: string;
    description: string;
    reward: string;
    rationale: string;
};

type OpenRouterPayload = {
    error?: { message?: string };
    model?: string;
    choices?: Array<{ message?: { content?: string } }>;
};

const FORBIDDEN_PUBLIC_LANGUAGE =
    /\b(datos?|base de datos|an[aá]lisis|crecimiento|ventas?|vender|negocios?|estudio de mercado|investigaci[oó]n|compra m[ií]nima|acumula(?:r)? puntos)\b/i;

const FORBIDDEN_CAMPAIGN_LANGUAGE =
    /\b(expansi[oó]n|ampliaci[oó]n|ampliar|nuev[ao]s? (?:local|sucursal|ubicaci[oó]n)|favoritismos?|favorecer al negocio|beneficio para (?:el|nuestro) negocio|atraer m[aá]s clientes)\b/i;

const SYSTEM_PROMPT = `Actúas como asistente senior de atención al cliente y marketing para Delicias Morán, un restaurante ecuatoriano de barrio en Quito.

TU FUNCIÓN:
- Dar ideas y borradores orientativos al administrador, no resolverle toda la campaña ni presentarla como una estrategia definitiva.
- Inspirar campañas sencillas que ayuden a conocer gustos de platos, sector, sugerencias y canales de contacto.
- El administrador siempre revisará, adaptará y decidirá antes de crear la campaña.
- El formulario existente recopila nombre, correo, teléfono, plato favorito, sector donde vive y sugerencias. No inventes otros campos.

ENFOQUE DE ATENCIÓN AL CLIENTE:
- El cliente debe sentirse escuchado, valorado, tratado con igualdad y beneficiado.
- La comunicación debe centrarse en compartir sus gustos y participar en un sorteo justo.
- Ningún sector, plato o grupo de clientes puede parecer favorecido sobre otro.
- La mecánica siempre es completar el formulario y participar en un sorteo.

RESTRICCIONES ABSOLUTAS:
- No menciones ni sugieras ampliaciones, nuevas sucursales, nuevas ubicaciones, crecimiento, ventas, vender más, beneficios para el negocio o favoritismos.
- En el texto público tampoco menciones recopilación de datos, bases de datos, análisis, investigación o estudios de mercado.
- No inventes rangos de fechas, etapas, compras mínimas, cupones condicionados, programas de puntos ni dinámicas adicionales.
- Evita lenguaje corporativo, manipulador o promesas engañosas.
- Los premios deben ser realistas para un restaurante de barrio.

ENTREGA:
- Propón exactamente tres ideas diferentes.
- title, description y reward son borradores públicos dirigidos al cliente.
- rationale es una nota privada y breve para el administrador: explica por qué la idea hace sentir valorado al cliente y qué preferencia o sugerencia permite comprender. Tampoco puede mencionar ampliaciones, ventas ni beneficios para el negocio.
- Responde exclusivamente con el objeto JSON solicitado, sin Markdown ni bloques de código, en español de Ecuador.`;

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
    const completeCopy = [publicCopy, idea.rationale]
        .filter((part): part is string => typeof part === "string")
        .join(" ");

    return (
        typeof idea.title === "string"
        && idea.title.length >= 3
        && idea.title.length <= 120
        && typeof idea.description === "string"
        && idea.description.length >= 3
        && idea.description.length <= 700
        && typeof idea.reward === "string"
        && idea.reward.length >= 2
        && idea.reward.length <= 220
        && typeof idea.rationale === "string"
        && idea.rationale.length <= 300
        && !FORBIDDEN_PUBLIC_LANGUAGE.test(publicCopy)
        && !FORBIDDEN_CAMPAIGN_LANGUAGE.test(completeCopy)
    );
}

function parseIdeas(content: string) {
    const withoutFences = content
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "");
    const start = withoutFences.indexOf("{");
    const end = withoutFences.lastIndexOf("}");

    if (start < 0 || end <= start) {
        throw new Error("La respuesta no contiene un objeto JSON completo");
    }

    const parsed = JSON.parse(
        withoutFences.slice(start, end + 1),
    ) as { ideas?: unknown[] };

    if (!Array.isArray(parsed.ideas)) {
        throw new Error("La respuesta no contiene una lista de ideas");
    }

    return parsed.ideas.filter(isCampaignIdea).slice(0, 3);
}

async function requestIdeasFromOpenRouter(input: {
    apiKey: string;
    origin: string;
    prompt: string;
    attempt: number;
}) {
    const retryInstruction = input.attempt > 1
        ? "\nEste es un reintento: entrega JSON completo, breve y sin bloques Markdown."
        : "";
    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": input.origin,
                "X-OpenRouter-Title": "Delicias Morán CRM",
            },
            body: JSON.stringify({
                model: FREE_OPENROUTER_MODEL,
                temperature: input.attempt > 1 ? 0.2 : 0.35,
                max_tokens: 1800,
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT,
                    },
                    {
                        role: "user",
                        content:
                            `Genera tres ideas orientativas de sorteo para hacer sentir valorado al cliente de Delicias Morán.${input.prompt ? `\n${input.prompt}` : ""}${retryInstruction}`,
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
            signal: AbortSignal.timeout(55_000),
        },
    );

    const rawPayload = await response.text();
    let payload: OpenRouterPayload;
    try {
        payload = JSON.parse(rawPayload) as OpenRouterPayload;
    } catch {
        throw new Error("OpenRouter devolvió una respuesta HTTP inválida");
    }

    if (!response.ok) {
        throw new Error(
            payload.error?.message
            || `OpenRouter rechazó la solicitud (${response.status})`,
        );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("El modelo gratuito no devolvió contenido");
    }

    return {
        ideas: parseIdeas(content),
        model: payload.model || FREE_OPENROUTER_MODEL,
    };
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

    const prompt = [
        objective ? `Enfoque adicional del administrador: ${objective}` : "",
        audience ? `Público deseado: ${audience}` : "",
        extraContext ? `Contexto adicional: ${extraContext}` : "",
    ].filter(Boolean).join("\n");
    const collectedIdeas: CampaignIdea[] = [];
    let modelUsed = FREE_OPENROUTER_MODEL;
    let lastError: unknown;

    for (
        let attempt = 1;
        attempt <= MAX_GENERATION_ATTEMPTS;
        attempt += 1
    ) {
        try {
            const result = await requestIdeasFromOpenRouter({
                apiKey,
                origin: request.nextUrl.origin,
                prompt,
                attempt,
            });
            modelUsed = result.model;

            for (const idea of result.ideas) {
                const duplicated = collectedIdeas.some(
                    (existing) =>
                        existing.title.trim().toLowerCase()
                        === idea.title.trim().toLowerCase(),
                );
                if (!duplicated) {
                    collectedIdeas.push(idea);
                }
            }

            if (collectedIdeas.length >= 3) {
                break;
            }

            lastError = new Error(
                `El intento ${attempt} devolvió solo ${result.ideas.length} idea(s) válida(s)`,
            );
        } catch (error) {
            lastError = error;
            console.warn("Intento del asistente de campañas fallido", {
                attempt,
                reason: error instanceof Error ? error.message : "Error desconocido",
            });
        }
    }

    if (collectedIdeas.length >= 2) {
        return NextResponse.json({
            ok: true,
            ideas: collectedIdeas.slice(0, 3),
            model: modelUsed,
            partial: collectedIdeas.length < 3,
        });
    }

    console.error(
        "Error del asistente de campañas",
        lastError instanceof Error ? lastError.message : lastError,
    );
    return jsonError(
        "Los modelos gratuitos no pudieron generar ideas válidas. Intenta nuevamente.",
        502,
    );
}
