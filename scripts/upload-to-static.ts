/**
 * @fileoverview Static Asset Upload Script for Supabase Storage
 *
 * This Deno script uploads image files to Supabase Storage bucket for static asset hosting.
 * It supports uploading individual files or entire directories of images with automatic
 * content type detection and cache control headers.
 *
 */

import { parseArgs } from '@std/cli/parse-args'
import { load } from '@std/dotenv'
import { exists } from '@std/fs/exists'
import { join } from '@std/path/join'
import { createClient } from '@supabase/supabase-js'

/**
 * Configuration and environment setup
 *
 * Loads environment variables from .env file and initializes Supabase client
 * for storage operations. Requires NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY
 * to be defined in the environment.
 */
const env = await load({ envPath: join(import.meta.dirname!, '../.env') })

const supabase = createClient(env.NUXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const bucket = supabase.storage.from('static')

const args = parseArgs(Deno.args, {
  boolean: ['upsert'],
  string: ['dir', 'path'],
})

/**
 * Command line arguments
 * @type {string} path - Source file or directory path
 * @type {string} uploadPath - Optional destination path in storage bucket
 */
const path = args.dir || Deno.args[0]
const uploadPath = args.path?.replace(/^\/|\/$/, '').trim() || ''
const upsert = args.upsert

/**
 * File system utility functions
 */

/**
 * Checks if a path is a directory
 * @param {string} file - Path to check
 * @returns {Promise<boolean>} True if path is a directory
 */
const isDirectory = async (file: string) => await exists(file, { isDirectory: true })

/**
 * Checks if a path is a file
 * @param {string} file - Path to check
 * @returns {Promise<boolean>} True if path is a file
 */
const isFile = async (file: string) => await exists(file, { isFile: true })

/**
 * Validates if a filename is a supported image format
 * @param {string} filename - Filename to validate
 * @returns {boolean} True if filename has supported image extension
 */
const isImage = (filename: string) => {
  return /.*\.(png|jpg|jpeg|gif|avif|webp)$/.test(filename)
}

/**
 * Creates an upload item configuration for a file
 * @param {string} filename - Name of the file
 * @param {string} filepath - Full path to the file
 * @returns {Object} Upload item with path, fileOptions, and getFile method
 */
const createUploadItem = (filename: string, filepath: string) => {
  const fileOptions = {
    contentType: `image/${filename.split('.').pop()}`,
    cacheControl: 'public, max-age=31536000',
    upsert,
  }
  const finalPath = `${uploadPath}/${filename}`.replace(/^\/|\/$/, '').trim()
  return {
    path: finalPath,
    fileOptions,
    getFile: async () => await Deno.readFile(filepath),
  }
}

/**
 * Main upload logic
 *
 * Processes the source path and creates upload items for all valid image files.
 * Supports both single file and directory uploads.
 */
const uploadItems: {
  path: string
  fileOptions: {
    contentType: string
    cacheControl: string
    upsert: boolean
  }
  getFile: () => ReturnType<typeof Deno.readFile>
}[] = []

if (await isDirectory(path)) {
  for await (const dirEntry of Deno.readDir(path)) {
    if (dirEntry.isFile && isImage(dirEntry.name)) {
      uploadItems.push(createUploadItem(dirEntry.name, `${path}/${dirEntry.name}`))
    } else {
      console.info('↪', dirEntry.name, 'is not an image. Skipping...')
    }
  }
} else if (await isFile(path)) {
  const filename = path.split('/').pop()
  if (!filename) {
    throw new Error(`No filename found for ${path}`)
  }
  uploadItems.push(createUploadItem(filename, path))
}

/**
 * Execute uploads with error handling
 *
 * Uploads all items in parallel using Promise.allSettled for robust error handling.
 * Each upload includes progress logging and detailed error reporting.
 */
const results = await Promise.allSettled(
  uploadItems.map(async (item) => {
    console.info(`⏳ Uploading ${item.path}...`)
    return await bucket.upload(item.path, await item.getFile(), item.fileOptions).catch((error) => {
      throw new Error(`'${item.path}' upload failed: ${error.message}`)
    })
  }),
)

/**
 * Results processing and reporting
 *
 * Counts successful uploads and reports detailed results to console.
 */
let successCount = 0

for (const r of results) {
  if (r.status === 'fulfilled') {
    successCount++
  } else {
    console.error('❌', r.reason)
  }
}

console.info(`\n✅ Successfully uploaded ${successCount} files!`)

/**
 * @example
 * // Upload a single image file
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/images/logo.png
 *
 * @example
 * // Upload a single image to a specific folder in storage
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/images/logo.png --path "branding"
 *
 * @example
 * // Upload a single image file with upsert
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/images/logo.png --path "branding" --upsert
 *
 * @example
 * // Upload all images from a directory
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/cards/
 *
 * @example
 * // Upload all images from a directory to a specific folder in storage
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/avatars/ --path "user-avatars"
 *
 * @example
 * // Upload with custom environment file
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir ./public/images/ --path "static-assets"
 *
 * @usage
 * # Basic usage
 * deno run --allow-read --allow-env --allow-net scripts/upload-to-static.js --dir <source-path> --path [destination-path]
 *
 * # Required permissions:
 * --allow-read: Read access to source files
 * --allow-env: Access to environment variables
 * --allow-net: Network access for Supabase API calls
 *
 * # Environment variables required:
 * NUXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 * SUPABASE_SECRET_KEY=your-secret-key
 *
 * # Supported image formats:
 * - PNG (.png)
 * - JPEG (.jpg, .jpeg)
 * - GIF (.gif)
 * - AVIF (.avif)
 * - WebP (.webp)
 *
 * # Features:
 * - Automatic content type detection
 * - Cache control headers (1 year max-age)
 * - Parallel upload processing
 * - Detailed progress logging
 * - Error handling with individual file reporting
 * - Support for single files or entire directories
 * - Optional destination path specification
 */
