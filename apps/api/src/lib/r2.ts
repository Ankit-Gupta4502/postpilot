import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let _s3: S3Client | null = null

function s3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
        secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
      },
    })
  }
  return _s3
}
const BUCKET = () => process.env['R2_BUCKET'] ?? 'social-media'
const PUBLIC_BASE = () => process.env['R2_PUBLIC_BASE_URL'] ?? ''

/** Upload a Buffer to R2 under the given key. Returns the public URL. */
export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  return `${PUBLIC_BASE()}/${key}`
}

/** Delete a key from R2 (best-effort). */
export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key })).catch(() => {})
}

/**
 * Generate a presigned PUT URL (for direct browser uploads — future use).
 * The browser uploads directly to R2; the API never touches the bytes.
 */
export async function presignPut(key: string, contentType: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  )
}
