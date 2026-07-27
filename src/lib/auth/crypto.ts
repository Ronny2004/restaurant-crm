import "server-only";

import {
    createHmac,
    randomBytes,
    randomInt,
    scrypt as scryptCallback,
    timingSafeEqual,
} from "node:crypto";

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function deriveKey(
    secret: string,
    salt: Buffer,
    length: number,
    options: { N: number; r: number; p: number; maxmem: number },
) {
    return new Promise<Buffer>((resolve, reject) => {
        scryptCallback(secret, salt, length, options, (error, derivedKey) => {
            if (error) {
                reject(error);
            } else {
                resolve(derivedKey);
            }
        });
    });
}

function getPepper() {
    const pepper = process.env.AUTH_PIN_PEPPER;

    if (!pepper || pepper.length < 32) {
        throw new Error("AUTH_PIN_PEPPER debe tener al menos 32 caracteres");
    }

    return pepper;
}

export function normalizePin(value: unknown) {
    if (typeof value !== "string" || !/^\d{6}$/.test(value)) {
        return null;
    }

    return value;
}

export function isWeakPin(pin: string) {
    if (!normalizePin(pin)) {
        return true;
    }

    const digits = [...pin].map(Number);
    const frequencies = new Map<string, number>();

    for (const digit of pin) {
        frequencies.set(digit, (frequencies.get(digit) ?? 0) + 1);
    }

    const hasFiveEqualDigits = Math.max(...frequencies.values()) >= 5;
    const isAscendingSequence = digits.every(
        (digit, index) => index === 0 || digit === digits[index - 1] + 1,
    );
    const isDescendingSequence = digits.every(
        (digit, index) => index === 0 || digit === digits[index - 1] - 1,
    );
    const hasRepeatedPattern =
        pin.slice(0, 2).repeat(3) === pin
        || pin.slice(0, 3).repeat(2) === pin;

    return (
        hasFiveEqualDigits
        || isAscendingSequence
        || isDescendingSequence
        || hasRepeatedPattern
    );
}

export function normalizeIdentifier(value: unknown) {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length >= 3 && normalized.length <= 254
        ? normalized
        : null;
}

export function keyedLookup(namespace: string, value: string) {
    return createHmac("sha256", getPepper())
        .update(`${namespace}:${value}`)
        .digest("hex");
}

export function hashIdentifier(namespace: string, value: string) {
    return keyedLookup(`identifier:${namespace}`, value);
}

export async function hashSecret(secret: string) {
    const salt = randomBytes(16);
    const derived = await deriveKey(secret + getPepper(), salt, KEY_LENGTH, {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: 64 * 1024 * 1024,
    });

    return [
        "scrypt",
        SCRYPT_N,
        SCRYPT_R,
        SCRYPT_P,
        salt.toString("base64url"),
        derived.toString("base64url"),
    ].join("$");
}

export async function verifySecret(secret: string, encoded: string) {
    const [algorithm, n, r, p, saltValue, hashValue] = encoded.split("$");

    if (
        algorithm !== "scrypt"
        || !n
        || !r
        || !p
        || !saltValue
        || !hashValue
    ) {
        return false;
    }

    const expected = Buffer.from(hashValue, "base64url");
    const actual = await deriveKey(
        secret + getPepper(),
        Buffer.from(saltValue, "base64url"),
        expected.length,
        {
            N: Number(n),
            r: Number(r),
            p: Number(p),
            maxmem: 64 * 1024 * 1024,
        },
    );

    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function generateSixDigitCode() {
    return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function generateChallengeToken() {
    return randomBytes(32).toString("base64url");
}
