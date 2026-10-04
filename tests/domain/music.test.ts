import { describe, expect, it } from "vitest";
import { toMusicEmbed } from "@/modules/music/domain/embed-url";

describe("music embed URLs", () => {
  it("accepts official provider links", () => {
    expect(toMusicEmbed("https://open.spotify.com/playlist/abc123")).toMatchObject({ provider: "spotify", embedUrl: "https://open.spotify.com/embed/playlist/abc123?utm_source=generator" });
    expect(toMusicEmbed("https://music.youtube.com/watch?v=video123")).toMatchObject({ provider: "youtube-music", embedUrl: "https://www.youtube.com/embed/video123" });
    expect(toMusicEmbed("https://music.apple.com/us/album/album-name/123")).toMatchObject({ provider: "apple-music", embedUrl: "https://embed.music.apple.com/us/album/album-name/123" });
  });

  it("rejects arbitrary and insecure URLs", () => {
    expect(toMusicEmbed("http://example.com/song")).toEqual({ error: "Music links must use https://" });
    expect(toMusicEmbed("https://example.com/song")).toEqual({ error: "That link is not from Spotify, YouTube Music, YouTube or Apple Music." });
  });
});
