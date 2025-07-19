import { load } from 'https://deno.land/std@0.220.1/dotenv/mod.ts'
import { join } from 'https://deno.land/std@0.220.1/path/mod.ts'
import { exists } from 'jsr:@std/fs/exists'
import { createClient } from 'jsr:@supabase/supabase-js'

// Load environment variables
const env = await load({ envPath: join(import.meta.dirname, '../.env') })

const supabase = createClient(env.NUXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const bucket = supabase.storage.from('static')

const path = Deno.args[0]
const uploadPath = Deno.args[1]?.replace(/^\/|\/$/, '').trim() || ''

const isDirectory = async (file) => await exists(file, { isDirectory: true })
const isFile = async (file) => await exists(file, { isFile: true })

const isImage = (filename) => {
  return /.*\.(png|jpg|jpeg|gif|avif|webp)$/.test(filename)
}

const createUploadItem = (filename, filepath) => {
  const fileOptions = {
    contentType: `image/${filename.split('.').pop()}`,
    cacheControl: 'public, max-age=31536000',
  }
  const finalPath = `${uploadPath}/${filename}`.replace(/^\/|\/$/, '').trim()
  return {
    path: finalPath,
    fileOptions,
    getFile: async () => await Deno.readFile(filepath),
  }
}

const uploadItems = []

if (isDirectory(path)) {
  for await (const dirEntry of Deno.readDir(path)) {
    if (dirEntry.isFile && isImage(dirEntry.name)) {
      uploadItems.push(createUploadItem(dirEntry.name, `${path}/${dirEntry.name}`))
    } else {
      console.info('↪', dirEntry.name, 'is a not an image. Skipping...')
    }
  }
} else if (isFile(path)) {
  uploadItems.push(createUploadItem(dirEntry.name, `${path}/${dirEntry.name}`))
}

const results = await Promise.allSettled(
  uploadItems.map(async (item) => {
    console.info(`⏳ Uploading ${item.path}...`)
    return await bucket.upload(item.path, await item.getFile(), item.fileOptions).catch((error) => {
      throw new Error(`'${item.filename}' upload failed: ${error.message}`)
    })
  }),
)

let successCount = 0

for (const r of results) {
  if (r.status === 'fulfilled') {
    successCount++
  } else {
    console.error('❌', r.reason)
  }
}

console.info(`\n✅ Successfully uploaded ${successCount} files!`)
