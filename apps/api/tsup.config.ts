import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  // O pacote compartilhado é TypeScript puro: é embutido no bundle da API.
  noExternal: ['@mf/shared'],
});
