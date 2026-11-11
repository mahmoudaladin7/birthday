# Ranim birthday

`index.html` is the whole site. Nothing to build or install.

## Deploy on Vercel
1. New GitHub repo → upload `index.html` at the top level of the repo (the `src` folder is optional).
2. Vercel → Add New → Project → import the repo.
3. Framework preset: **Other**. Leave build and output settings empty. Deploy.
   If you upload the whole `roro-birthday` folder instead, set **Root Directory** to `roro-birthday`.

## Using your own song
Upload your audio file next to `index.html` and name it exactly `song.mp3`.
The page finds it on its own and plays it for the dance instead of the built-in beat.
Without the file, the built-in beat plays.

To fine-tune, change this line in `src/app.tsx` and rebuild (or ask Claude to):
`const SONG = { src: "song.mp3", bpm: 120, start: 43.27, seconds: 27 }`
- `bpm`: the song's tempo, so the dance keeps time
- `start`: where in the song to start, in seconds
- `seconds`: how long he dances (the song stops with him)

## Editing (optional)
`src/` is the source. In `src/app.tsx`: the wish is `WISH`, the joke is `JOKES`.
