import { parseLocalDate } from "./dates";

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function urgencyColour(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((parseLocalDate(dateStr).getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return "#b04040";
  if (diff <= 2) return "#c06030";
  if (diff <= 6) return "#c8a050";
  return "var(--ink-medium)";
}

export const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let out = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
  }
  return out;
}
