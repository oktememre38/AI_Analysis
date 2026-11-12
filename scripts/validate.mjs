// Checks data.json before it is committed.
// Errors (exit 1): broken structure or impossible values.
// Warnings: large jumps against the previous commit, worth a second look.
// Usage: node scripts/validate.mjs [path-to-previous-data.json]
import { readFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url);
const data = JSON.parse(readFileSync(new URL("data.json", root), "utf8"));
const prevPath = process.argv[2];
const prev = prevPath && existsSync(prevPath) ? JSON.parse(readFileSync(prevPath, "utf8")) : null;

const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);
const isDate = s => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const num = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;

const SUBS = { claude: 1, chatgpt: 2, gemini: 1, deepseek: 0, opencode: 0 }; // highest tier index
const MAKERS = ["anthropic", "openai", "google", "deepseek", "other"];
const LEVELS = ["", "non-reasoning", "low", "medium", "high", "xhigh", "max"];
const SOURCES = ["aa", "lb", "ar", "vals", "opencode", "plans"];

if (data.schema !== 1) err("schema must be 1");
if (!isDate(data.checked)) err("checked must be YYYY-MM-DD");
if (!isDate(data.updated)) err("updated must be YYYY-MM-DD");
for (const k of SOURCES) {
  const s = data.sources?.[k];
  if (!s) { err(`sources.${k} missing`); continue; }
  if (!isDate(s.date)) err(`sources.${k}.date must be YYYY-MM-DD`);
  if (!["ok", "stale"].includes(s.status)) err(`sources.${k}.status must be "ok" or "stale"`);
  if (s.date > data.checked) err(`sources.${k}.date is after checked`);
}
for (const k of ["accessNotes", "caveats"]) if (typeof data[k] !== "string" || !data[k]) err(`${k} must be a non-empty string`);

const names = new Set();
if (!Array.isArray(data.families) || data.families.length < 10) err("families must list at least 10 models");
for (const f of data.families || []) {
  const at = `families["${f.name}"]`;
  if (typeof f.name !== "string" || !f.name) { err("family without a name"); continue; }
  if (names.has(f.name)) err(`${at} is listed twice`);
  names.add(f.name);
  if (!MAKERS.includes(f.maker)) err(`${at}.maker must be one of ${MAKERS.join(", ")}`);
  if (!Array.isArray(f.access)) err(`${at}.access must be an array`);
  for (const a of f.access || []) {
    if (!(a.s in SUBS)) err(`${at}.access: unknown subscription "${a.s}"`);
    else if (!Number.isInteger(a.t) || a.t < 0 || a.t > SUBS[a.s]) err(`${at}.access: tier ${a.t} out of range for ${a.s}`);
    if (a.note != null && typeof a.note !== "string") err(`${at}.access.note must be a string`);
  }
  const onGo = (f.access || []).some(a => a.s === "opencode");
  if (onGo && !(f.go === "unlimited" || num(f.go, 1, 1e7))) err(`${at}.go must be a request count or "unlimited" for OpenCode Go models`);
  if (!Array.isArray(f.v)) { err(`${at}.v must be an array`); continue; }
  if (!f.v.length) {
    // Not scored by AA yet: allowed only if at least one independent source lists it
    const e = data.ext?.[f.name];
    if (!e || !(e.lb || e.ar != null || e.vals)) err(`${at}: v is empty and no independent source (lb, ar, vals) lists it`);
    else warn(`${f.name}: no AA score yet (shown only in the source comparison)`);
    continue;
  }
  const seen = new Set();
  for (const v of f.v) {
    const [effort, intel, cost, time] = v;
    if (!LEVELS.includes(effort)) err(`${at}: unknown effort "${effort}"`);
    if (seen.has(effort)) err(`${at}: effort "${effort}" listed twice`);
    seen.add(effort);
    if (!num(intel, 0, 100)) err(`${at} (${effort}): intelligence must be 0–100`);
    if (cost !== null && !num(cost, 0, 500)) err(`${at} (${effort}): cost must be null or 0–500`);
    if (time !== null && !num(time, 0, 1000)) err(`${at} (${effort}): time must be null or 0–1000`);
  }
}
for (const [n, e] of Object.entries(data.ext || {})) {
  if (!names.has(n)) err(`ext["${n}"] has no matching family`);
  if (e.lb && !(num(e.lb[0], 0, 100) && (e.lb[1] === null || num(e.lb[1], 0, 500)))) err(`ext["${n}"].lb must be [score 0–100, cost or null]`);
  if (e.ar != null && !num(e.ar, 800, 2500)) err(`ext["${n}"].ar must be an arena score 800–2500`);
  if (e.vals && !(num(e.vals[0], 0, 100) && (e.vals[1] === null || num(e.vals[1], 0, 2000)))) err(`ext["${n}"].vals must be [percent 0–100, cost or null]`);
}

if (prev) {
  const before = new Map((prev.families || []).map(f => [f.name, f]));
  for (const n of before.keys()) if (!names.has(n)) warn(`model removed: ${n}`);
  for (const f of data.families || []) {
    const p = before.get(f.name);
    if (!p) { warn(`model added: ${f.name}`); continue; }
    const pv = new Map(p.v.map(v => [v[0], v]));
    for (const v of f.v) {
      const o = pv.get(v[0]);
      if (o && Math.abs(o[1] - v[1]) >= 8) warn(`${f.name} (${v[0]}): intelligence ${o[1]} → ${v[1]}`);
      if (o && o[2] && v[2] && (v[2] / o[2] > 2 || o[2] / v[2] > 2)) warn(`${f.name} (${v[0]}): cost $${o[2]} → $${v[2]}`);
    }
  }
}

warnings.forEach(w => console.log("WARN  " + w));
errors.forEach(e => console.log("ERROR " + e));
console.log(errors.length ? `${errors.length} error(s)` : `data.json OK (${names.size} models, ${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
