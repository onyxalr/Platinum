# Bundled runtime resources

Place an optional standalone `yt-dlp` binary in `bin/`:

```bash
npm run fetch:ytdlp
```

Without a bundled binary Platinum downloads yt-dlp automatically into
`~/.config/Platinum/bin` on first launch. The binary is intentionally ignored
by git; release builds may include it for an offline first launch.
