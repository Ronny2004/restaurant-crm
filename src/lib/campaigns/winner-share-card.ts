const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1080;

function roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.arcTo(x + width, y, x + width, y + height, radius);
    context.arcTo(x + width, y + height, x, y + height, radius);
    context.arcTo(x, y + height, x, y, radius);
    context.arcTo(x, y, x + width, y, radius);
    context.closePath();
}

function wrapCenteredText(
    context: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    startY: number,
    maxWidth: number,
    lineHeight: number,
) {
    const words = text.trim().split(/\s+/);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width <= maxWidth || !line) {
            line = candidate;
        } else {
            lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);

    lines.forEach((value, index) => {
        context.fillText(value, centerX, startY + (index * lineHeight));
    });
    return startY + (lines.length * lineHeight);
}

async function loadLogo() {
    const image = new Image();
    image.src = "/assets/logo.webp";
    await image.decode();
    return image;
}

export async function createWinnerShareFile(winnerName: string, reward: string) {
    const canvas = document.createElement("canvas");
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo generar la imagen del ganador");

    const gradient = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
    gradient.addColorStop(0, "#351408");
    gradient.addColorStop(0.55, "#622b12");
    gradient.addColorStop(1, "#2a1008");
    context.fillStyle = gradient;
    context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    context.globalAlpha = 0.16;
    context.fillStyle = "#f4c45e";
    for (let index = 0; index < 28; index += 1) {
        const x = (index * 193) % CARD_WIDTH;
        const y = (index * 317) % CARD_HEIGHT;
        context.beginPath();
        context.arc(x, y, 8 + ((index * 7) % 24), 0, Math.PI * 2);
        context.fill();
    }
    context.globalAlpha = 1;

    roundedRect(context, 70, 70, 940, 940, 54);
    context.fillStyle = "rgba(255, 248, 231, 0.97)";
    context.fill();
    context.strokeStyle = "#d89a2b";
    context.lineWidth = 5;
    context.stroke();

    try {
        const logo = await loadLogo();
        context.save();
        context.beginPath();
        context.arc(540, 180, 72, 0, Math.PI * 2);
        context.clip();
        context.drawImage(logo, 468, 108, 144, 144);
        context.restore();
    } catch {
        context.fillStyle = "#5a2511";
        context.beginPath();
        context.arc(540, 180, 72, 0, Math.PI * 2);
        context.fill();
    }

    context.textAlign = "center";
    context.fillStyle = "#6b2d12";
    context.font = "800 28px Arial, sans-serif";
    context.fillText("DELICIAS MORÁN", 540, 292);

    context.fillStyle = "#b65c20";
    context.font = "900 48px Arial, sans-serif";
    context.fillText("¡TENEMOS GANADOR/A!", 540, 375);

    context.fillStyle = "#3d1c10";
    context.font = "900 82px Georgia, serif";
    const winnerEnd = wrapCenteredText(context, winnerName, 540, 510, 800, 94);

    const rewardTop = Math.max(675, winnerEnd + 24);
    roundedRect(context, 155, rewardTop, 770, 205, 30);
    context.fillStyle = "#f7d991";
    context.fill();
    context.strokeStyle = "#d89a2b";
    context.lineWidth = 3;
    context.stroke();

    context.fillStyle = "#8b4217";
    context.font = "800 24px Arial, sans-serif";
    context.fillText("PREMIO", 540, rewardTop + 48);
    context.fillStyle = "#3d1c10";
    context.font = "800 38px Arial, sans-serif";
    wrapCenteredText(context, reward, 540, rewardTop + 105, 680, 48);

    context.fillStyle = "#6b2d12";
    context.font = "700 27px Arial, sans-serif";
    context.fillText("¡Felicitaciones y gracias por participar!", 540, 955);

    const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) resolve(result);
            else reject(new Error("No se pudo exportar la imagen del ganador"));
        }, "image/png");
    });

    return new File([blob], "ganador-delicias-moran.png", { type: "image/png" });
}

export function downloadWinnerShareFile(file: File) {
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
