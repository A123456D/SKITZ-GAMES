# Playlist folder

Put your `.mp3` files here, then add each one in
`src/audio/playlist.ts`:

```ts
export const MUSIC_PLAYLIST: MusicTrack[] = [
  { id: "song1", src: "/assets/audio/playlist/song1.mp3", title: "Song One" },
  { id: "song2", src: "/assets/audio/playlist/song2.mp3", title: "Song Two" },
];
```

Refresh the game after saving. Tracks shuffle with a soft crossfade.
