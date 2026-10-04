export type MusicProvider = "spotify" | "youtube" | "youtube-music" | "apple-music";

export interface MusicEmbed {
  provider: MusicProvider;
  label: string;
  title?: string;
  sourceUrl: string;
  embedUrl: string;
}

const labels: Record<MusicProvider, string> = {
  spotify: "Spotify",
  youtube: "YouTube",
  "youtube-music": "YouTube Music",
  "apple-music": "Apple Music",
};

function queryValue(url: URL, key: string): string | null {
  const value = url.searchParams.get(key);
  return value && /^[\w-]+$/.test(value) ? value : null;
}

/** Convert only official provider URLs into iframe URLs; arbitrary URLs are rejected. */
export function toMusicEmbed(raw: string): MusicEmbed | { error: string } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { error: "Paste a complete music link, including https://" };
  }
  if (url.protocol !== "https:") return { error: "Music links must use https://" };
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "open.spotify.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const kind = parts[0];
    const id = parts[1];
    if (!id || !["album", "artist", "playlist", "track", "episode", "show"].includes(kind ?? "")) return { error: "Use a Spotify album, playlist, track, artist, podcast or episode link." };
    return { provider: "spotify", label: labels.spotify, sourceUrl: url.toString(), embedUrl: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator` };
  }

  if (host === "music.youtube.com" || host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be") {
    const isMusic = host === "music.youtube.com";
    const video = host === "youtu.be" ? url.pathname.slice(1).split("/")[0] : queryValue(url, "v");
    const list = queryValue(url, "list");
    if (list) return { provider: isMusic ? "youtube-music" : "youtube", label: labels[isMusic ? "youtube-music" : "youtube"], sourceUrl: url.toString(), embedUrl: `https://www.youtube.com/embed/videoseries?list=${list}` };
    if (video) return { provider: isMusic ? "youtube-music" : "youtube", label: labels[isMusic ? "youtube-music" : "youtube"], sourceUrl: url.toString(), embedUrl: `https://www.youtube.com/embed/${video}` };
    return { error: "Use a YouTube video or playlist link." };
  }

  if (host === "music.apple.com" || host === "embed.music.apple.com") {
    const path = url.pathname.split("/").filter(Boolean);
    if (path.length < 3) return { error: "Use an Apple Music song, album or playlist link." };
    return { provider: "apple-music", label: labels["apple-music"], sourceUrl: url.toString(), embedUrl: `https://embed.music.apple.com${url.pathname}${url.search}` };
  }

  return { error: "That link is not from Spotify, YouTube Music, YouTube or Apple Music." };
}
