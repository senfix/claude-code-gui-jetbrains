import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

await build({
  entryPoints: ['src/server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/backend.mjs',
  sourcemap: true,
  minify: false,
  external: [],
  define: {
    '__PLUGIN_VERSION__': JSON.stringify(pkg.version),
  },
  banner: {
    js: `import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);`,
  },
});

console.log('Backend bundled successfully');
