export async function webhookHandler(msg: { body: unknown }) {
  const payload = msg.body as { platform: string; event: string; data: unknown }
  console.log(`Processing webhook: ${payload.platform}/${payload.event}`)
  // TODO: Route to platform-specific webhook handler
}
