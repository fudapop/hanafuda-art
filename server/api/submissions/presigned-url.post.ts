import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { fileName, fileType, cardName } = body

    if (!fileName || !fileType || !cardName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: fileName, fileType, cardName'
      })
    }

    // Create admin client with service role key
    const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Missing Supabase configuration'
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Generate unique file path
    const timestamp = Date.now()
    const userId = 'anonymous' // Since users aren't signed in
    const extension = fileName.split('.').pop() || 'jpg'
    const filePath = `submissions/${userId}/${timestamp}/${cardName}.${extension}`

    // Generate presigned URL for upload
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUploadUrl(filePath, {
        upsert: false, // Don't allow overwriting existing files
      })

    if (error) {
      console.error('Error creating presigned URL:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to create presigned URL: ${error.message}`
      })
    }

    return {
      success: true,
      uploadUrl: data.signedUrl,
      path: filePath,
      token: data.token,
      expiresAt: data.expiresAt,
    }
  } catch (error) {
    console.error('Presigned URL generation error:', error)
    
    if (error.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error'
    })
  }
})
