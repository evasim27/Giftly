import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function eur(value: number | string | null | undefined) { return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(Number(value ?? 0)); }
export function dateLabel(value: string | null | undefined) { if (!value) return "No date"; return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value.slice(0,10)}T12:00:00Z`)); }
export function parsePage(value: string | undefined) { const n = Number(value); return Number.isSafeInteger(n) && n > 0 && n <= 1_000_000 ? n : 1; }
