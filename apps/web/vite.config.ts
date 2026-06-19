import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const dir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(dir, '../..')

export default defineConfig({
  envDir: rootDir,
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
  ],
})
