import type { Metadata } from "next";
import { Headphones } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PageStack } from "@/components/shared/page-stack";
import { MusicPlayer } from "@/modules/music/components/music-player";

export const metadata: Metadata = { title: "Music" };

export default function MusicPage() {
  return (
    <>
      <PageHeader title="Music dock" icon={Headphones} description="Put on a focus playlist without leaving your prep cockpit." />
      <PageStack>
        <MusicPlayer libraryOnly />
        <section className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Supported links</p>
          <p className="mt-1">Spotify playlists and tracks, YouTube Music playlists and songs, YouTube videos and playlists, and Apple Music songs, albums and playlists.</p>
        </section>
      </PageStack>
    </>
  );
}
