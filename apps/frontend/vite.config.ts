import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';

// Get git commit hash at build time
// First checks environment variable (for Docker builds), then tries git command
function getGitCommitHash(): string {
  // Check environment variable first (set by Docker build args)
  if (process.env.VITE_GIT_COMMIT_HASH && process.env.VITE_GIT_COMMIT_HASH !== 'unknown') {
    return process.env.VITE_GIT_COMMIT_HASH;
  }
  // Fallback to git command for local development
  try {
    return execSync('git rev-parse HEAD').toString().trim();
  } catch {
    return 'unknown';
  }
}

// Get build date - from environment or generate new
function getBuildDate(): string {
  if (process.env.VITE_BUILD_DATE) {
    return process.env.VITE_BUILD_DATE;
  }
  return new Date().toISOString();
}

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_GIT_COMMIT_HASH': JSON.stringify(getGitCommitHash()),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(getBuildDate()),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
      },
    },
  },
});
