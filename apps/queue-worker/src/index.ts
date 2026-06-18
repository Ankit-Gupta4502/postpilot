import { runWorker } from './worker.js'

console.log('PostPilot queue worker starting...')

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down...')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down...')
  process.exit(0)
})

runWorker().catch((err) => {
  console.error('Worker crashed:', err)
  process.exit(1)
})
