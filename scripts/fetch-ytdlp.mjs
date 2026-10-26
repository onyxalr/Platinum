#!/usr/bin/env node
/**
 * Downloads a standalone yt-dlp binary into resources/bin so it can be shipped
 * with Platinum. The app can also download yt-dlp on first launch, so this
 * script is optional and mainly useful for offline-friendly release builds.
 */
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force') || process.env.YTDLP_FORCE === '1';
const requestedVersion = process.env.YTDLP_VERSION?.trim();
const arch = process.arch;
const asset = arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';

if (process.platform !== 'linux') {
  console.error('[yt-dlp] This project targets Linux.');
  process.exit(1);
}

if (!['x64', 'arm64'].includes(arch)) {
  console.error(`[yt-dlp] Unsupported architecture: ${arch}`);
  process.exit(1);
}

const destDir = path.join(root, 'resources', 'bin');
const dest = path.join(destDir, 'yt-dlp');
const temp = `${dest}.part`;

async function versionOf(binary) {
  try {
    return execFileSync(binary, ['--version'], { encoding: 'utf8', timeout: 15_000 }).trim();
  } catch {
    return null;
  }
}

if (!force) {
  const current = await versionOf(dest);
  if (current) {
    console.log(`[yt-dlp] Already present: ${dest} (${current})`);
    process.exit(0);
  }
}

const base = requestedVersion
  ? `https://github.com/yt-dlp/yt-dlp/releases/download/${encodeURIComponent(requestedVersion)}`
  : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
const url = `${base}/${asset}`;

await fs.mkdir(destDir, { recursive: true });
console.log(`[yt-dlp] Downloading ${url}`);

try {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'Platinum/0.1 (release build)' },
  });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const total = Number(response.headers.get('content-length') || 0);
  let received = 0;
  let lastTick = 0;
  const body = Readable.fromWeb(response.body);
  body.on('data', (chunk) => {
    received += chunk.length;
    const now = Date.now();
    if (now - lastTick < 500) return;
    lastTick = now;
    const progress = total ? `${Math.round((received / total) * 100)}%` : `${(received / 1024 / 1024).toFixed(1)} MiB`;
    process.stdout.write(`\r[yt-dlp] ${progress}`);
  });

  await pipeline(body, createWriteStream(temp));
  if (total && received !== total) {
    throw new Error(`Incomplete download: ${received} of ${total} bytes`);
  }

  await fs.chmod(temp, 0o755);
  await fs.rename(temp, dest);
  const version = await versionOf(dest);
  if (!version) throw new Error('Downloaded binary is not executable');
  console.log(`\n[yt-dlp] Ready: ${dest} (${version})`);
} catch (error) {
  await fs.rm(temp, { force: true }).catch(() => undefined);
  console.error(`\n[yt-dlp] Failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
