import { defineCollection, defineContentConfig, z } from '@nuxt/content'

// Define supported locales
const SUPPORTED_LOCALES = ['en', 'ja'] as const

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

const changelogSchema = z.object({
  title: z.string(),
  description: z.string(),
  version: z.string(),
  publishedAt: z.string().date(),
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

  collections[`changelog_${locale}`] = defineCollection({
    type: 'page',
    source: {
      include: `${locale}/changelog/**/*.md`,
    },
    schema: changelogSchema,
  })
}

export default defineContentConfig({
  collections,
})
