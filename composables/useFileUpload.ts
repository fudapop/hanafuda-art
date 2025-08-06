import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { FileUploadProgress } from '~/types/submissions'

export const useFileUpload = () => {
  const supabase = useSupabaseClient()
  const uploads = ref<Map<string, FileUploadProgress>>(new Map())
  const isUploading = computed(() => {
    return Array.from(uploads.value.values()).some(upload => upload.uploading)
  })

  const uploadFile = async (
    file: File,
    bucket: string = 'submissions'
  ): Promise<{ url: string; fileName: string } | null> => {
    const uploadId = nanoid()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${nanoid()}.${fileExtension}`
    const filePath = `${fileName}`

    // Initialize upload progress
    uploads.value.set(uploadId, {
      fileName: file.name,
      progress: 0,
      uploading: true
    })

    try {
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        uploads.value.set(uploadId, {
          fileName: file.name,
          progress: 0,
          uploading: false,
          error: error.message
        })
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        uploads.value.set(uploadId, {
          fileName: file.name,
          progress: 0,
          uploading: false,
          error: 'Failed to get public URL'
        })
        throw new Error('Failed to get public URL')
      }

      // Update progress to complete
      uploads.value.set(uploadId, {
        fileName: file.name,
        progress: 100,
        uploading: false,
        url: urlData.publicUrl
      })

      return { url: urlData.publicUrl, fileName }

    } catch (error) {
      uploads.value.set(uploadId, {
        fileName: file.name,
        progress: 0,
        uploading: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      })
      throw error
    }
  }

  const clearUploads = () => {
    uploads.value.clear()
  }

  const removeUpload = (fileName: string) => {
    for (const [key, upload] of uploads.value.entries()) {
      if (upload.fileName === fileName) {
        uploads.value.delete(key)
        break
      }
    }
  }

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Please upload a PNG, JPEG, or WebP image file.'
      }
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB.'
      }
    }

    return { valid: true }
  }

  return {
    uploads: computed(() => Array.from(uploads.value.values())),
    isUploading,
    uploadFile,
    clearUploads,
    removeUpload,
    validateFile
  }
}