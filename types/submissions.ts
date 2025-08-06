export interface DesignSubmission {
  id: string
  artist_name: string
  description: string
  social_media_links: {
    instagram?: string
    twitter?: string
    website?: string
    portfolio?: string
  }
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  submitted_at: string
  status: 'pending' | 'approved' | 'rejected'
  created_at?: string
  updated_at?: string
}

export interface SubmissionFormData {
  artist_name: string
  description: string
  social_media_links: {
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

// Supabase table insert type
export interface SubmissionInsert {
  artist_name: string
  description: string
  social_media_links: {
    instagram?: string
    twitter?: string
    website?: string
    portfolio?: string
  }
  file_name: string
  file_url: string
  file_size: number
  mime_type: string
  status?: 'pending' | 'approved' | 'rejected'
}