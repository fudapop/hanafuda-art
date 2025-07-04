import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    announcements: defineCollection({
      type: 'page',
      source: 'announcements/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        features: z.array(z.string()).optional(),
      }),
    }),
    policies: defineCollection({
      type: 'page',
      source: 'policies/**/*.md',
    }),
  },
})
