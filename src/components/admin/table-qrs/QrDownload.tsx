"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Clipboard, Download } from "lucide-react";
import type { TableQrCode } from "@/types/table-qr";

export function QrDownload({ qr, publicUrl }: { qr: TableQrCode; publicUrl: string }) {
    const [dataUrl, setDataUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        void QRCode.toDataURL(publicUrl, {
            width: 720,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: "#4b2416", light: "#fffaf0" },
        }).then(setDataUrl);
    }, [publicUrl]);

    const copy = async () => {
        await navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="table-qr-preview">
            {dataUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt={`Código QR ${qr.name}`} />
            )}
            <div>
                <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
                    {copied ? <Check size={17} /> : <Clipboard size={17} />}
                    {copied ? "Copiado" : "Copiar enlace"}
                </button>
                <a
                    className="btn btn-primary"
                    href={dataUrl}
                    download={`${qr.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
                >
                    <Download size={17} /> Descargar QR
                </a>
            </div>
        </div>
    );
}
