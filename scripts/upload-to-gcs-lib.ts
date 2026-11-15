/**
 * @fileoverview Pure helpers for scripts/upload-to-gcs.ts.
 *
 * Object keys match the Supabase `static` bucket: a destination prefix plus
 * the file name, with no leading slash.
 */

const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
}

/**
 * @param filename File name including its extension.
 * @returns True when the extension is one this uploader sends.
 */
export const isImage = (filename: string): boolean => {
  return contentTypeFor(filename) !== null
}

/**
 * @param filename File name including its extension.
 * @returns The image media type, or null when the extension is not supported.
 */
export const contentTypeFor = (filename: string): string | null => {
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return CONTENT_TYPES[extension] ?? null
}

/**
 * Builds the GCS object key.
 *
 * @param uploadPath Destination prefix inside the bucket. Slashes at either end are removed.
 * @param filename File name only, not a directory.
 * @returns Object key with no leading slash.
 * @throws {Error} When the file name is empty or contains a slash.
 */
export const objectKey = (uploadPath: string, filename: string): string => {
  const name = filename.trim()
  if (!name || name.includes('/') || name.includes('\\')) {
    throw new Error(`Expected a file name, got '${filename}'`)
  }
  const prefix = uploadPath.replace(/^\/+|\/+$/g, '').trim()
  return prefix ? `${prefix}/${name}` : name
}

/**
 * @param bytes Object bytes.
 * @param metadata GCS object resource fields.
 * @param boundary Multipart boundary. Must not occur inside the image bytes.
 * @returns The multipart/related body for a GCS JSON API upload.
 */
export const multipartUploadBody = (
  bytes: Uint8Array,
  metadata: { name: string; contentType: string; cacheControl: string },
  boundary: string,
): Uint8Array => {
  const encoder = new TextEncoder()
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({
      name: metadata.name,
      contentType: metadata.contentType,
      cacheControl: metadata.cacheControl,
    })}\r\n--${boundary}\r\nContent-Type: ${metadata.contentType}\r\n\r\n`,
  )
  const tail = encoder.encode(`\r\n--${boundary}--\r\n`)
  const body = new Uint8Array(head.length + bytes.length + tail.length)
  body.set(head, 0)
  body.set(bytes, head.length)
  body.set(tail, head.length + bytes.length)
  return body
}
