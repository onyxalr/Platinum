import { build, context } from 'esbuild';
import path from 'node:path';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'cjs',
  outdir: 'dist-electron',
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  sourcemap: watch ? 'inline' : false,
  minify: !watch,
  logLevel: 'info',
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
  },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[electron] watching…');
} else {
  await build(options);
  console.log('[electron] built');
}
