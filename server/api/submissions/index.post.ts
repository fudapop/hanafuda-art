import { Resend } from 'resend'
import { getFirestore, doc, setDoc, Timestamp } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { nanoid } from 'nanoid'
import type { DesignSubmission, SubmissionFormData } from '~/types/submissions'

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  })
}

const resend = new Resend(process.env.RESEND_API_KEY)

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
      artistName, 
      description, 
      socialMediaLinks,
      fileName,
      fileUrl,
      fileSize,
      mimeType 
    } = body

    // Validate required fields
    if (!artistName || !description || !fileName || !fileUrl) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields'
      })
    }

    // Generate submission ID
    const submissionId = `sub_${nanoid(15)}`

    // Prepare submission data
    const submission: DesignSubmission = {
      id: submissionId,
      artistName,
      description,
      socialMediaLinks: socialMediaLinks || {},
      fileName,
      fileUrl,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'image/jpeg',
      submittedAt: new Date(),
      status: 'pending'
    }

    // Save to Firestore
    const db = getFirestore()
    await setDoc(doc(db, 'submissions', submissionId), {
      ...submission,
      submittedAt: Timestamp.fromDate(submission.submittedAt)
    })

    // Send email notification to admin
    const socialLinksText = Object.entries(socialMediaLinks || {})
      .filter(([_, value]) => value)
      .map(([platform, url]) => `${platform}: ${url}`)
      .join('\n')

    await resend.emails.send({
      from: 'submissions@fudapop.com',
      to: 'admin@fudapop.com',
      subject: `New Design Submission from ${artistName}`,
      html: `
        <h2>New Design Submission</h2>
        <p><strong>Artist:</strong> ${artistName}</p>
        <p><strong>Description:</strong></p>
        <p>${description}</p>
        
        ${socialLinksText ? `
        <p><strong>Social Media Links:</strong></p>
        <pre>${socialLinksText}</pre>
        ` : ''}
        
        <p><strong>File Details:</strong></p>
        <ul>
          <li>Filename: ${fileName}</li>
          <li>Size: ${Math.round(fileSize / 1024)} KB</li>
          <li>Type: ${mimeType}</li>
        </ul>
        
        <p><strong>View File:</strong> <a href="${fileUrl}" target="_blank">Open Image</a></p>
        
        <p><em>Submission ID: ${submissionId}</em></p>
      `
    })

    return {
      success: true,
      submissionId,
      message: 'Submission received successfully'
    }

  } catch (error) {
    console.error('Submission error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Internal Server Error'
    })
  }
})