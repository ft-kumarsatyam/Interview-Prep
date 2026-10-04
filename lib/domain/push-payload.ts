/**
 * Turns a full PrepOS message (the same one the email renders) into a Web Push payload. A system
 * notification only shows a title and a few lines, so the body is a summary: the roast, the headline
 * numbers, then one line per section. Tapping it opens the full message in the app. Pure.
 */
import type { MailSection, MailSpec } from "./mail-html";
import type { PushContent } from "./roast";

export interface PushAction {
  action: string;
  title: string;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Same tag replaces the previous notification instead of stacking (e.g. one morning plan per day). */
  tag: string;
  /** App path opened when the notification itself is tapped. */
  url: string;
  actions: PushAction[];
  /** Paths for each action, keyed by `action`. */
  actionUrls: Record<string, string>;
}

/** Most platforms truncate the title around here and the body after a few short lines. */
export const PUSH_TITLE_MAX = 60;
export const PUSH_BODY_LINES = 5;
export const PUSH_LINE_MAX = 90;

function clip(s: string, max: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** "Problems: Two Sum +2 more", "Left: the daily quiz", or the first bar. */
export function sectionLine(s: MailSection): string | null {
  const items = s.items ?? [];
  const extra = (s.more?.count ?? 0) + Math.max(0, items.length - 1);
  if (items.length > 0) return `${s.heading}: ${items[0].title}${extra > 0 ? ` +${extra} more` : ""}`;
  if (s.lines?.length) return `${s.heading}: ${s.lines[0]}${s.lines.length > 1 ? ` +${s.lines.length - 1} more` : ""}`;
  if (s.bars?.length) return `${s.heading}: ${s.bars[0].label} ${s.bars[0].pct}%`;
  return null;
}

/** Summary lines for a structured message, most important first. */
export function summaryLines(spec: MailSpec, roast?: string): string[] {
  const stats = (spec.stats ?? []).slice(0, 3).map((s) => `${s.value} ${s.label}`);
  return [
    ...(roast ? [roast] : []),
    ...(stats.length ? [stats.join(" · ")] : [spec.intro]),
    ...(spec.callouts ?? []).map((c) => c.text),
    ...spec.sections.flatMap((s) => sectionLine(s) ?? []),
  ];
}

/** "iPhone · Safari", "Mac · Chrome": enough to tell devices apart in Settings. */
export function deviceLabel(userAgent: string, standalone = false): string {
  const ua = userAgent;
  const device = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\//.test(ua)
      ? "Firefox"
      : /(Chrome|CriOS)\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Browser";
  return `${device} · ${standalone ? "installed app" : browser}`;
}

export function buildPushPayload(content: PushContent, opts: { url: string; tag: string }): PushPayload {
  const spec = content.spec;
  const title = spec ? (spec.kicker ? `${spec.kicker} · ${spec.title}` : spec.title) : content.title;
  const raw = spec
    ? summaryLines(spec, content.roast)
    : content.body.split("\n").filter((l) => l.trim().length > 0);
  const lines = raw.slice(0, PUSH_BODY_LINES).map((l) => clip(l, PUSH_LINE_MAX));

  const actions: PushAction[] = [{ action: "open", title: "View details" }];
  const actionUrls: Record<string, string> = { open: opts.url };
  if (spec?.cta) {
    actions.push({ action: "cta", title: clip(spec.cta.label, 24) });
    actionUrls.cta = spec.cta.path;
  }

  return { title: clip(title, PUSH_TITLE_MAX), body: lines.join("\n"), tag: opts.tag, url: opts.url, actions, actionUrls };
}
