"use client";

import { useEffect, useRef } from "react";

export function PinInput({
    value,
    onChange,
    autoFocus = false,
    label = "PIN de 6 dígitos",
}: {
    value: string;
    onChange: (value: string) => void;
    autoFocus?: boolean;
    label?: string;
}) {
    const inputs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        if (autoFocus) {
            inputs.current[0]?.focus();
        }
    }, [autoFocus]);

    const setDigit = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, "").slice(-1);
        const digits = Array.from({ length: 6 }, (_, position) =>
            position === index ? digit : value[position] || "",
        );
        onChange(digits.join("").slice(0, 6));
        if (digit && index < 5) {
            inputs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (event: React.ClipboardEvent) => {
        const pasted = event.clipboardData
            .getData("text")
            .replace(/\D/g, "")
            .slice(0, 6);
        if (!pasted) return;
        event.preventDefault();
        onChange(pasted);
        inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
    };

    return (
        <fieldset className="pin-fieldset">
            <legend className="sr-only">{label}</legend>
            <div className="pin-input-group" onPaste={handlePaste}>
                {Array.from({ length: 6 }, (_, index) => (
                    <input
                        key={index}
                        ref={(element) => {
                            inputs.current[index] = element;
                        }}
                        className="pin-box"
                        type="password"
                        inputMode="numeric"
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        aria-label={`Dígito ${index + 1}`}
                        value={value[index] || ""}
                        onChange={(event) => setDigit(index, event.target.value)}
                        onKeyDown={(event) => {
                            if (
                                event.key === "Backspace"
                                && !value[index]
                                && index > 0
                            ) {
                                inputs.current[index - 1]?.focus();
                            }
                            if (event.key === "ArrowLeft" && index > 0) {
                                inputs.current[index - 1]?.focus();
                            }
                            if (event.key === "ArrowRight" && index < 5) {
                                inputs.current[index + 1]?.focus();
                            }
                        }}
                    />
                ))}
            </div>
        </fieldset>
    );
}
