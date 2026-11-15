/**
 * @fileoverview Upload image files to the public GCS static bucket.
 *
 * Sibling of upload-to-static.ts. That script still uploads to Supabase.
 * Until the app stops requesting Supabase URLs, upload a new file to both.
 * Keys match the Supabase `static` bucket (`cards/`, `avatars/`, `assets/`).
 *
 * Authentication is Application Default Credentials through `gcloud`. This
 * script does not read a JSON key or a secret from the repo. See
 * infra/README.md for the uploader service account and the impersonation grant.
 *
 * @example
 * // One image, under cards/cherry-version/
 * deno task upload-to-gcs -- --dir ./matsu-1.webp --path cards/cherry-version
 *
 * @example
 * // Every image in a directory, overwriting objects that already exist
 * deno task upload-to-gcs -- --dir ./public/cards/cherry-version --path cards/cherry-version --upsert
 */

import { parseArgs } from '@std/cli/parse-args'
import { exists } from '@std/fs/exists'
import { join } from '@std/path/join'
import { contentTypeFor, isImage, multipartUploadBody, objectKey, uploadUrl } from './upload-to-gcs-lib.ts'

const CACHE_CONTROL = 'public, max-age=31536000'
const BUCKET = Deno.env.get('GCS_STATIC_BUCKET')?.trim() || 'fudapop-static'

const args = parseArgs(Deno.args, {
  boolean: ['upsert'],
  string: ['dir', 'path', 'bucket'],
})

const source = args.dir || Deno.args[0]
const uploadPath = args.path ?? ''
const upsert = args.upsert
const bucket = args.bucket?.trim() || BUCKET

/**
 * @returns An access token for the GCS JSON API.
 * @throws {Error} When gcloud is missing or Application Default Credentials are not logged in.
 */
const accessToken = async (): Promise<string> => {
  const commandArgs = ['auth', 'application-default', 'print-access-token']
  const impersonate = Deno.env.get('GCS_IMPERSONATE_SERVICE_ACCOUNT')?.trim()
  if (impersonate) {
    commandArgs.push(`--impersonate-service-account=${impersonate}`)
  }

  let result: Deno.CommandOutput
  try {
    result = await new Deno.Command('gcloud', {
      args: commandArgs,
      stdout: 'piped',
      stderr: 'piped',
    }).output()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`gcloud is required on PATH for Application Default Credentials. ${message}`)
  }

  if (result.code !== 0) {
    const stderr = new TextDecoder().decode(result.stderr).trim()
    throw new Error(`gcloud auth application-default print-access-token failed: ${stderr}`)
  }

  const token = new TextDecoder().decode(result.stdout).trim()
  if (!token) {
    throw new Error('gcloud returned an empty access token.')
  }
  return token
}

const isDirectory = async (file: string) => await exists(file, { isDirectory: true })
const isFile = async (file: string) => await exists(file, { isFile: true })

type UploadItem = {
  key: string
  contentType: string
  read: () => Promise<Uint8Array>
}

/**
 * @param filename File name inside the source directory or path.
 * @param filepath Absolute or relative path to read.
 * @returns One upload, or null when the file is not a supported image.
 */
const uploadItem = (filename: string, filepath: string): UploadItem | null => {
  const contentType = contentTypeFor(filename)
  if (!contentType) {
    return null
  }
  return {
    key: objectKey(uploadPath, filename),
    contentType,
    read: () => Deno.readFile(filepath),
  }
}

if (!source) {
  console.error('Pass --dir with a file or a directory of images.')
  Deno.exit(1)
}

const items: UploadItem[] = []

if (await isDirectory(source)) {
  for await (const entry of Deno.readDir(source)) {
    if (entry.isFile && isImage(entry.name)) {
      const item = uploadItem(entry.name, join(source, entry.name))
      if (item) {
        items.push(item)
      }
    } else {
      console.info('↪', entry.name, 'is not an image. Skipping...')
    }
  }
} else if (await isFile(source)) {
  const filename = source.split('/').pop()
  if (!filename) {
    throw new Error(`No filename found for ${source}`)
  }
  const item = uploadItem(filename, source)
  if (!item) {
    throw new Error(`'${filename}' is not a supported image.`)
  }
  items.push(item)
} else {
  console.error(`Nothing found at ${source}`)
  Deno.exit(1)
}

if (items.length === 0) {
  console.error(`No images to upload from ${source}`)
  Deno.exit(1)
}

const token = await accessToken()

/**
 * @param key Object key.
 * @returns True when the object is already in the bucket.
 * @throws {Error} When the metadata request fails for a reason other than a missing object.
 */
const objectExists = async (key: string): Promise<boolean> => {
  const response = await fetch(
    `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (response.status === 404) {
    return false
  }
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`'${key}' lookup failed (${response.status}): ${detail}`)
  }
  return true
}

/**
 * @param item File to upload.
 * @throws {Error} When GCS rejects the upload.
 */
const upload = async (item: UploadItem): Promise<void> => {
  if (!upsert && (await objectExists(item.key))) {
    console.info('↪', item.key, 'already exists. Skipping... (pass --upsert to overwrite)')
    return
  }

  console.info(`⏳ Uploading ${item.key}...`)
  const boundary = `gcs${crypto.randomUUID().replaceAll('-', '')}`
  const body = multipartUploadBody(
    await item.read(),
    { name: item.key, contentType: item.contentType, cacheControl: CACHE_CONTROL },
    boundary,
  )
  const response = await fetch(uploadUrl(bucket, upsert), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  })
  // 412 is the generation precondition. Another upload created the object
  // after the existence check. Leave that object in place.
  if (!upsert && response.status === 412) {
    await response.body?.cancel()
    console.info('↪', item.key, 'already exists. Skipping... (pass --upsert to overwrite)')
    return
  }
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`'${item.key}' upload failed (${response.status}): ${detail}`)
  }
}

const results = await Promise.allSettled(items.map((item) => upload(item)))

let successCount = 0
for (const result of results) {
  if (result.status === 'fulfilled') {
    successCount++
  } else {
    console.error('❌', result.reason)
  }
}

console.info(`\n✅ Finished ${successCount} of ${items.length} files in gs://${bucket}`)

if (successCount !== items.length) {
  Deno.exit(1)
}
