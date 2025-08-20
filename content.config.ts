import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Define supported locales
const localization = JSON.parse(readFileSync(resolve('./localization.json'), 'utf-8'))
const SUPPORTED_LOCALES = localization.locales.map((l: any) => l.code) as string[]

// Define common schemas
const announcementSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  features: z.array(z.string()).optional(),
  // Impression tracking
  impressions: z
    .object({
      views: z.number().default(0),
      likes: z.number().default(0),
    })
    .optional(),
})

// Create collections for each locale
const collections: Record<string, any> = {}

for (const locale of SUPPORTED_LOCALES) {
  collections[`announcements_${locale}`] = defineCollection({
    type: 'page',
    source: {
      include: `${locale}/announcements/**/*.md`,
      prefix: '',
    },
    schema: announcementSchema,
  })

  collections[`policies_${locale}`] = defineCollection({
    type: 'page',
    source: {
      include: `${locale}/policies/**/*.md`,
      prefix: '',
    },
  })

  collections[`misc_${locale}`] = defineCollection({
    type: 'page',
    source: {
      include: `${locale}/misc/**/*.md`,
      prefix: '',
    },
  })
}

export default defineContentConfig({
  collections,
})
