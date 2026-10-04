/**
 * One layout for every PrepOS email (morning plan, evening nudge, night recap, weekly report), so they
 * look and read alike. Pure: a spec in, `{ text, html }` out. All text is escaped; links only become
 * clickable when `appUrl` is set. Hex colours are fine here: email clients can't read CSS variables.
 */
import { escapeHtml } from "@/core/domain/html";

export interface MailLink {
  title: string;
  /** App path such as `/dsa/two-sum`; made absolute with `appUrl` when there is one. */
  path: string;
  /** Short grey note after the title, e.g. "Medium" or "InfoQ · 6 min". */
  note?: string;
}

export type MailTone = "neutral" | "good" | "warn" | "bad" | "info";

export interface MailStat {
  label: string;
  value: string;
  tone?: MailTone;
}

export interface MailBar {
  label: string;
  /** 0-100. */
  pct: number;
  /** Text after the percentage, e.g. "(12/36), +4 this week". */
  detail?: string;
}

export interface MailSection {
  heading: string;
  lines?: string[];
  /** Progress bars: drawn as coloured bars in HTML and as text bars in the plain-text copy. */
  bars?: MailBar[];
  items?: MailLink[];
  /** "+N more" row after the items, linking to where the rest live. */
  more?: { count: number; path: string; label?: string };
  tone?: MailTone;
}

export interface MailSpec {
  title: string;
  /** Small label above the title, e.g. "Morning plan". */
  kicker?: string;
  intro: string;
  stats?: MailStat[];
  callouts?: Array<{ tone: MailTone; text: string }>;
  sections: MailSection[];
  footer?: string[];
  cta?: { label: string; path: string };
  appUrl?: string;
}

const TONE: Record<MailTone, { fg: string; bg: string; edge: string }> = {
  neutral: { fg: "#374151", bg: "#f3f4f6", edge: "#d1d5db" },
  good: { fg: "#166534", bg: "#f0fdf4", edge: "#16a34a" },
  warn: { fg: "#92400e", bg: "#fffbeb", edge: "#d97706" },
  bad: { fg: "#991b1b", bg: "#fef2f2", edge: "#dc2626" },
  info: { fg: "#1e40af", bg: "#eff6ff", edge: "#2563eb" },
};

const BAR_WIDTH = 10;

/** A text progress bar such as "██████░░░░". */
export function asciiBar(pct: number): string {
  const filled = Math.max(0, Math.min(BAR_WIDTH, Math.round((pct / 100) * BAR_WIDTH)));
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

const FONT = "-apple-system,Segoe UI,Roboto,sans-serif";

/** `spec` is the input without `appUrl`, kept so the PWA can show the same message natively. */
export function renderMail(spec: MailSpec): { text: string; html: string; spec: MailSpec } {
  const base = spec.appUrl?.replace(/\/+$/, "");
  const href = (path: string) => (base ? `${base}${path}` : null);
  const cta = spec.cta ?? { label: "Open PrepOS", path: "/dashboard" };

  const textItem = (l: MailLink) => {
    const url = href(l.path);
    return `- ${l.title}${l.note ? ` (${l.note})` : ""}${url ? `\n  ${url}` : ""}`;
  };
  const sectionText = (s: MailSection) => {
    const more = s.more && s.more.count > 0 ? [`- +${s.more.count} more${href(s.more.path) ? `\n  ${href(s.more.path)}` : ""}`] : [];
    const bars = (s.bars ?? []).map((b) => `- ${b.label}: ${asciiBar(b.pct)} ${b.pct}%${b.detail ? ` ${b.detail}` : ""}`);
    return `\n${s.heading}\n${[...(s.lines ?? []).map((x) => `- ${x}`), ...bars, ...(s.items ?? []).map(textItem), ...more].join("\n")}`;
  };
  const statsLine = spec.stats?.length ? spec.stats.map((s) => `${s.label}: ${s.value}`).join(" · ") : null;
  const text = [
    spec.intro,
    ...(spec.callouts ?? []).map((c) => c.text),
    ...(statsLine ? [statsLine] : []),
    ...spec.sections.map(sectionText),
    ...(spec.footer?.length ? ["", ...spec.footer] : []),
    ...(base ? ["", `${cta.label}: ${base}${cta.path}`] : []),
  ].join("\n");

  const link = (l: MailLink) => {
    const url = href(l.path);
    const label = url ? `<a href="${escapeHtml(url)}" style="color:#2563eb;text-decoration:none">${escapeHtml(l.title)}</a>` : escapeHtml(l.title);
    const note = l.note ? ` <span style="color:#6b7280">· ${escapeHtml(l.note)}</span>` : "";
    return `<li style="margin:4px 0">${label}${note}</li>`;
  };
  const stat = (s: MailStat) => {
    const t = TONE[s.tone ?? "neutral"];
    return `<td style="padding:0 6px 6px 0"><div style="padding:8px 12px;border-radius:10px;background:${t.bg};border:1px solid ${t.edge}"><div style="font:700 18px/1.2 ${FONT};color:${t.fg}">${escapeHtml(s.value)}</div><div style="font:12px/1.3 ${FONT};color:#6b7280">${escapeHtml(s.label)}</div></div></td>`;
  };
  const sectionHtml = (s: MailSection) => {
    const t = TONE[s.tone ?? "neutral"];
    const bars = (s.bars ?? []).map((b) => {
      const pct = Math.max(0, Math.min(100, b.pct));
      return `<li style="margin:8px 0;list-style:none;margin-left:-20px"><div style="font-size:14px"><strong>${escapeHtml(b.label)}</strong> <span style="color:#374151">${pct}%</span>${b.detail ? ` <span style="color:#6b7280">${escapeHtml(b.detail)}</span>` : ""}</div><div style="height:8px;margin-top:3px;background:#e5e7eb;border-radius:4px"><div style="width:${pct}%;height:8px;background:#4b3fc4;border-radius:4px"></div></div></li>`;
    });
    const rows = [
      ...(s.lines ?? []).map((x) => `<li style="margin:4px 0">${escapeHtml(x)}</li>`),
      ...bars,
      ...(s.items ?? []).map(link),
      ...(s.more && s.more.count > 0
        ? [
            (() => {
              const url = href(s.more.path);
              const label = `+${s.more.count} more${s.more.label ? ` ${escapeHtml(s.more.label)}` : ""}`;
              return `<li style="margin:4px 0;color:#6b7280">${url ? `<a href="${escapeHtml(url)}" style="color:#6b7280">${label}</a>` : label}</li>`;
            })(),
          ]
        : []),
    ];
    return `<h3 style="margin:18px 0 6px;font-size:15px;padding-left:8px;border-left:3px solid ${t.edge}">${escapeHtml(s.heading)}</h3><ul style="margin:0;padding-left:20px">${rows.join("")}</ul>`;
  };
  const html = [
    `<div style="font-family:${FONT};max-width:560px;color:#111827;line-height:1.5">`,
    ...(spec.kicker ? [`<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${escapeHtml(spec.kicker)}</p>`] : []),
    `<h2 style="margin:0 0 8px">${escapeHtml(spec.title)}</h2>`,
    `<p style="margin:0 0 16px">${escapeHtml(spec.intro)}</p>`,
    ...(spec.callouts ?? []).map((c) => {
      const t = TONE[c.tone];
      return `<p style="margin:0 0 12px;padding:8px 12px;background:${t.bg};border-left:3px solid ${t.edge};color:${t.fg}">${escapeHtml(c.text)}</p>`;
    }),
    ...(spec.stats?.length ? [`<table role="presentation" style="border-collapse:collapse;margin:0 0 8px"><tr>${spec.stats.map(stat).join("")}</tr></table>`] : []),
    ...spec.sections.map(sectionHtml),
    ...(spec.footer ?? []).map((f) => `<p style="margin:16px 0 0;color:#374151">${escapeHtml(f)}</p>`),
    ...(base
      ? [`<p style="margin:22px 0 0"><a href="${escapeHtml(`${base}${cta.path}`)}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#4b3fc4;color:#ffffff;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`]
      : []),
    `</div>`,
  ].join("");

  const plain: MailSpec = { ...spec };
  delete plain.appUrl;
  return { text, html, spec: plain };
}
