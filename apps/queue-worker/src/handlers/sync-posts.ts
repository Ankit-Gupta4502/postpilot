export async function syncPostsHandler(msg: { body: unknown }) {
  const payload = msg.body as { socialAccountId: string }
  console.log(`Syncing posts for account ${payload.socialAccountId}`)
  // TODO: Call platform adapter syncPosts()
}
