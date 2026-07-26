"use client";

import { Delete } from "lucide-react";

export function NumericKeypad({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
}) {
    const append = (digit: string) => {
        if (value.length < 6) onChange(value + digit);
    };

    return (
        <div className="numeric-keypad" aria-label="Teclado numérico">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                    type="button"
                    key={digit}
                    disabled={disabled}
                    onClick={() => append(digit)}
                >
                    {digit}
                </button>
            ))}
            <button
                type="button"
                disabled={disabled}
                aria-label="Limpiar PIN"
                onClick={() => onChange("")}
            >
                C
            </button>
            <button type="button" disabled={disabled} onClick={() => append("0")}>
                0
            </button>
            <button
                type="button"
                disabled={disabled}
                aria-label="Borrar último dígito"
                onClick={() => onChange(value.slice(0, -1))}
            >
                <Delete size={22} />
            </button>
        </div>
    );
}
