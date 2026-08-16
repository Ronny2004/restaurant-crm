import { ExternalLink, Globe2, MessageCircle } from "lucide-react";
import { CAMPAIGN_DEFAULT_LINKS } from "@/lib/campaigns/public-links";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

function safeUrl(raw: string) {
    const cleaned = raw.replace(/[),.;!?]+$/, "");
    try {
        const url = new URL(cleaned);
        return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch {
        return null;
    }
}

function isWhatsApp(url: URL) {
    return url.hostname === "wa.me" || url.hostname.endsWith("whatsapp.com");
}

export function RichCampaignText({ text }: { text: string }) {
    const matches = Array.from(text.matchAll(URL_PATTERN));
    const links = Array.from(new Map(
        [
            ...matches
            .map((match) => safeUrl(match[0]))
            .filter((url): url is URL => Boolean(url)),
            ...CAMPAIGN_DEFAULT_LINKS.map((link) => new URL(link)),
        ]
            .map((url) => [url.toString(), url]),
    ).values());

    let cursor = 0;
    const parts: React.ReactNode[] = [];
    for (const match of matches) {
        if (match.index === undefined) continue;
        const url = safeUrl(match[0]);
        if (!url) continue;
        parts.push(text.slice(cursor, match.index));
        parts.push(
            <a
                key={`${url.toString()}-${match.index}`}
                href={url.toString()}
                target="_blank"
                rel="noopener noreferrer"
            >
                {url.toString()}
            </a>,
        );
        const cleanLength = match[0].replace(/[),.;!?]+$/, "").length;
        const suffix = match[0].slice(cleanLength);
        if (suffix) parts.push(suffix);
        cursor = match.index + match[0].length;
    }
    parts.push(text.slice(cursor));

    return (
        <div className="campaign-rich-description">
            <p>{parts}</p>
            <div className="campaign-rich-links">
                {links.map((url) => {
                    const whatsapp = isWhatsApp(url);
                    const Icon = whatsapp ? MessageCircle : Globe2;
                    return (
                        <a
                            key={url.toString()}
                            href={url.toString()}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={whatsapp ? "Abrir WhatsApp" : "Visitar sitio web"}
                        >
                            <span><Icon size={21} /></span>
                            <span>
                                <small>{whatsapp ? "Únete por WhatsApp" : "Visita nuestro sitio"}</small>
                                <strong>{url.hostname.replace(/^www\./, "")}</strong>
                            </span>
                            <ExternalLink size={17} />
                        </a>
                    );
                })}
            </div>
        </div>
    );
}
