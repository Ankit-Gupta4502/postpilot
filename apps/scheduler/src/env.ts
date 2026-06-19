import { config } from 'dotenv'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Load .env from the monorepo root (three levels up from apps/scheduler/src/)
const dir = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(dir, '../../../.env') })
