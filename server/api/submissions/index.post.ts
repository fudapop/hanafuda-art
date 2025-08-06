import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'
import type { SubmissionInsert } from '~/types/submissions'

const resend = new Resend(process.env.RESEND_API_KEY)

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NUXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, // service role key for server operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default defineEventHandler(async (event) => {
  if (getMethod(event) !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    const body = await readBody(event)
    const { 
      artist_name, 
      description, 
      social_media_links,
      file_name,
      file_url,
      file_size,
      mime_type 
    } = body

    // Validate required fields
    if (!artist_name || !description || !file_name || !file_url) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: artist_name, description, file_name, and file_url are required'
      })
    }

    // Prepare submission data for Supabase
    const submissionData: SubmissionInsert = {
      artist_name,
      description,
      social_media_links: social_media_links || {},
      file_name,
      file_url,
      file_size: file_size || 0,
      mime_type: mime_type || 'image/jpeg',
      status: 'pending'
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('submissions')
      .insert(submissionData)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw createError({
        statusCode: 500,
        statusMessage: `Database error: ${error.message}`
      })
    }

    const submissionId = data.id

    // Send email notification to admin
    const socialLinksText = Object.entries(social_media_links || {})
      .filter(([_, value]) => value)
      .map(([platform, url]) => `${platform}: ${url}`)
      .join('\n')

    try {
      await resend.emails.send({
        from: 'submissions@fudapop.com',
        to: 'admin@fudapop.com',
        subject: `New Design Submission from ${artist_name}`,
        html: `
          <h2>New Design Submission</h2>
          <p><strong>Artist:</strong> ${artist_name}</p>
          <p><strong>Description:</strong></p>
          <p>${description}</p>
          
          ${socialLinksText ? `
          <p><strong>Social Media Links:</strong></p>
          <pre>${socialLinksText}</pre>
          ` : ''}
          
          <p><strong>File Details:</strong></p>
          <ul>
            <li>Filename: ${file_name}</li>
            <li>Size: ${Math.round(file_size / 1024)} KB</li>
            <li>Type: ${mime_type}</li>
          </ul>
          
          <p><strong>View File:</strong> <a href="${file_url}" target="_blank">Open Image</a></p>
          
          <p><em>Submission ID: ${submissionId}</em></p>
          <p><em>Submitted at: ${new Date().toISOString()}</em></p>
        `
      })
    } catch (emailError) {
      // Log email error but don't fail the submission
      console.error('Email notification failed:', emailError)
    }

    return {
      success: true,
      submissionId,
      message: 'Submission received successfully'
    }

  } catch (error) {
    console.error('Submission error:', error)
    
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Internal Server Error'
    })
  }
})