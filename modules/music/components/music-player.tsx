"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExternalLink, Expand, Headphones, Music2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toMusicEmbed, type MusicEmbed } from "@/modules/music/domain/embed-url";

const STORAGE_KEY = "prepos:music-embeds";
const LEGACY_STORAGE_KEY = "prepos:music-embed";
const EVENT = "prepos:music-embed";
const POSITION_KEY = "prepos:music-position";
type DockPosition = "bottom-left" | "bottom-center" | "bottom-right" | "top-left" | "top-right";
const DOCK_POSITIONS: Array<{ id: DockPosition; label: string }> = [
  { id: "bottom-left", label: "Bottom left" },
  { id: "bottom-center", label: "Bottom center" },
  { id: "bottom-right", label: "Bottom right" },
  { id: "top-left", label: "Top left" },
  { id: "top-right", label: "Top right" },
];

function positionClass(position: DockPosition): string {
  if (position === "bottom-left") return "bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] left-3 sm:left-5 lg:bottom-5";
  if (position === "bottom-right") return "bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] right-3 sm:right-5 lg:bottom-5";
  if (position === "top-left") return "top-[calc(var(--topbar-h)+0.75rem+env(safe-area-inset-top))] left-3 sm:left-5";
  if (position === "top-right") return "top-[calc(var(--topbar-h)+0.75rem+env(safe-area-inset-top))] right-3 sm:right-5";
  return "bottom-[calc(var(--tabbar-h)+0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 lg:bottom-5";
}

function readSaved(): MusicEmbed[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "null") as MusicEmbed | MusicEmbed[] | null;
    const items = Array.isArray(parsed) ? parsed : parsed?.embedUrl && parsed.sourceUrl ? [parsed] : [];
    return items.filter((item) => item.embedUrl && item.sourceUrl);
  } catch {
    return [];
  }
}

function playerHeight(provider: MusicEmbed["provider"]): string {
  if (provider === "spotify") return "h-[152px]";
  if (provider === "apple-music") return "h-[175px]";
  return "h-24";
}

function providerHelp(saved: MusicEmbed): string {
  return saved.provider === "youtube-music"
    ? "YouTube Music songs are played through YouTube’s official embed. Some tracks require opening YouTube Music directly."
    : "Click Play inside the official player to start playback.";
}

function displayName(item: MusicEmbed): string {
  return item.title?.trim() || item.label;
}

export function MusicPlayer({ compact = false, libraryOnly = false }: { compact?: boolean; libraryOnly?: boolean }) {
  const [saved, setSaved] = useState<MusicEmbed[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [raw, setRaw] = useState("");
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(!compact);
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState<DockPosition>("bottom-center");

  useEffect(() => {
    const load = () => {
      const items = readSaved();
      setSaved(items);
      setActiveIndex((current) => Math.min(current, Math.max(0, items.length - 1)));
    };
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, []);

  useEffect(() => {
    const loadPosition = () => {
      const value = window.localStorage.getItem(POSITION_KEY) as DockPosition | null;
      if (value && DOCK_POSITIONS.some((item) => item.id === value)) setPosition(value);
    };
    loadPosition();
    window.addEventListener(`${EVENT}:position`, loadPosition);
    return () => window.removeEventListener(`${EVENT}:position`, loadPosition);
  }, []);

  const changePosition = (next: DockPosition) => {
    setPosition(next);
    window.localStorage.setItem(POSITION_KEY, next);
    window.dispatchEvent(new Event(`${EVENT}:position`));
  };

  const save = () => {
    const result = toMusicEmbed(raw);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    const named = { ...result, title: title.trim() || result.label };
    const next = [named, ...saved.filter((item) => item.sourceUrl !== result.sourceUrl)];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next);
    setActiveIndex(0);
    setRaw("");
    setTitle("");
    setError("");
    window.dispatchEvent(new Event(EVENT));
  };

  const remove = (sourceUrl: string) => {
    const next = saved.filter((item) => item.sourceUrl !== sourceUrl);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSaved(next);
    setActiveIndex((current) => Math.min(current, Math.max(0, next.length - 1)));
    window.dispatchEvent(new Event(EVENT));
  };

  const active = saved[activeIndex] ?? saved[0] ?? null;

  if (compact) {
    if (!active) {
      return (
        <Button variant="outline" size="sm" className={`fixed z-40 gap-2 rounded-full bg-card/95 shadow-sm backdrop-blur ${positionClass(position)}`} asChild>
          <Link href="/music"><Headphones className="size-4 text-primary" aria-hidden /> Music</Link>
        </Button>
      );
    }
    const panelClass = open
      ? `fixed z-40 w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border bg-card/95 shadow-lg backdrop-blur ${positionClass(position)}`
      : "pointer-events-none fixed -left-[9999px] top-0 z-40 w-[23rem] overflow-hidden opacity-0";
    return (
      <>
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs">
            <button type="button" onClick={() => setExpanded(true)} className="flex min-w-0 items-center gap-1.5 truncate text-left font-medium hover:text-primary" aria-label="Open large music player"><Music2 className="size-3.5 shrink-0 text-primary" aria-hidden /> <span className="truncate">{displayName(active)}</span><span className="text-muted-foreground">· {saved.length}</span></button>
            <div className="flex shrink-0 gap-1">
              <button type="button" onClick={() => setExpanded(true)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Open large music player"><Expand className="size-3.5" /></button>
              <Link href="/music" className="rounded px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">Change</Link>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Minimize music player"><X className="size-3.5" /></button>
            </div>
          </div>
          <iframe src={active.embedUrl} title={`${displayName(active)} player`} className={`${playerHeight(active.provider)} w-full border-0`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          <p className="border-t px-3 py-1.5 text-center text-2xs text-muted-foreground">Playback continues when minimized</p>
        </div>
        {!open && (
          <Button
            variant="outline"
            size="icon"
            className={`fixed z-40 size-10 rounded-full bg-card/95 shadow-lg backdrop-blur ${positionClass(position)}`}
            onClick={() => setOpen(true)}
            aria-label={`Restore music player: ${displayName(active)}`}
            title={`Restore music player: ${displayName(active)}`}
          >
            <Music2 className="size-4 text-primary" aria-hidden />
          </Button>
        )}
        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="max-w-3xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Music2 className="size-4 text-primary" aria-hidden /> {displayName(active)}</DialogTitle>
              <DialogDescription>{providerHelp(active)} <a href={active.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">Open original</a></DialogDescription>
            </DialogHeader>
            <iframe src={active.embedUrl} title={`${active.label} large player`} className="h-[min(70vh,32rem)] w-full rounded-xl border-0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Headphones className="size-4 text-primary" aria-hidden /> Add your music</CardTitle>
        <CardDescription>Paste an official Spotify, YouTube Music, YouTube or Apple Music link. It stays on this device; no account or API key is needed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Playlist name (optional)" aria-label="Playlist name" />
          <Input value={raw} onChange={(event) => { setRaw(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") save(); }} placeholder="https://open.spotify.com/playlist/…" aria-label="Music playlist or song URL" />
          <Button onClick={save} className="sm:w-auto"><Save className="mr-2 size-4" /> Use this link</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Tip: use a playlist for a longer focus session. Click Play inside the official player. If a YouTube Music track says “Watch on YouTube”, use Open original below.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Player position:</span>
          {DOCK_POSITIONS.map((item) => (
            <Button key={item.id} type="button" variant={position === item.id ? "default" : "outline"} size="xs" onClick={() => changePosition(item.id)}>{item.label}</Button>
          ))}
        </div>
        {saved.length > 0 && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border">
              {saved.map((item, index) => (
                <div key={item.sourceUrl} className={`flex items-center gap-3 border-b p-3 last:border-b-0 ${index === activeIndex ? "bg-primary/5" : ""}`}>
                  <button type="button" onClick={() => setActiveIndex(index)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                    <Music2 className={`size-4 shrink-0 ${index === activeIndex ? "text-primary" : "text-muted-foreground"}`} aria-hidden />
                    <span className="min-w-0 truncate text-sm font-medium">{displayName(item)}</span>
                    <span className="shrink-0 text-xs capitalize text-muted-foreground">{item.provider.replace("-", " ")}</span>
                    {index === activeIndex && <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-2xs text-success">Playing</span>}
                  </button>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label={`Open ${displayName(item)} original`}><ExternalLink className="size-3.5" /></a>
                  <Button variant="ghost" size="icon-xs" onClick={() => remove(item.sourceUrl)} aria-label={`Remove ${displayName(item)}`}><X className="size-3.5" /></Button>
                </div>
              ))}
            </div>
            {libraryOnly ? (
              <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Your selected playlist stays in the centered bottom controller while you move around the app.</p>
            ) : active ? (
              <iframe src={active.embedUrl} title={`${active.label} player`} className={`${playerHeight(active.provider)} w-full rounded-xl border-0`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
