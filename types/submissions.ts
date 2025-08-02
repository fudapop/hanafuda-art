export interface DesignSubmission {
  id: string
  artistName: string
  description: string
  socialMediaLinks: {
    instagram?: string
    twitter?: string
    website?: string
    portfolio?: string
  }
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  submittedAt: Date
  status: 'pending' | 'approved' | 'rejected'
}

export interface SubmissionFormData {
  artistName: string
  description: string
  socialMediaLinks: {
    instagram?: string
    twitter?: string
    website?: string
    portfolio?: string
  }
}

export interface FileUploadProgress {
  fileName: string
  progress: number
  uploading: boolean
  error?: string
  url?: string
}