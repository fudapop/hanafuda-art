import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@4.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '')

    const { 
      artist_name, 
      description, 
      social_media_links,
      file_name,
      file_url,
      file_size,
      mime_type 
    } = await req.json()

    // Validate required fields
    if (!artist_name || !description || !file_name || !file_url) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: artist_name, description, file_name, and file_url are required' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Insert submission into database
    const { data, error } = await supabaseClient
      .from('submissions')
      .insert({
        artist_name,
        description,
        social_media_links: social_media_links || {},
        file_name,
        file_url,
        file_size: file_size || 0,
        mime_type: mime_type || 'image/jpeg',
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    const submissionId = data.id

    // Send email notification
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

    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        message: 'Submission received successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Submission error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})