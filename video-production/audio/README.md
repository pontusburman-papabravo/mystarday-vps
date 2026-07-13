# Licensed audio (not committed)

Place royalty-cleared music and ambient beds here. Filenames must match the paths in each film manifest.

Example for **A Morning Without Nagging**:

- `morning-theme.mp3` — main music bed
- `morning-ambient.mp3` — soft kitchen ambience

The render step skips missing audio files with a warning. For placeholder testing, run `npm run test:placeholders` — it synthesizes silent audio via ffmpeg.
