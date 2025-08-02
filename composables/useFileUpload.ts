import { ref, computed } from 'vue'
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytesResumable, 
  getDownloadURL,
  type UploadTaskSnapshot 
} from 'firebase/storage'
import { nanoid } from 'nanoid'
import type { FileUploadProgress } from '~/types/submissions'

export const useFileUpload = () => {
  const uploads = ref<Map<string, FileUploadProgress>>(new Map())
  const isUploading = computed(() => {
    return Array.from(uploads.value.values()).some(upload => upload.uploading)
  })

  const uploadFile = async (
    file: File,
    folder: string = 'submissions'
  ): Promise<{ url: string; fileName: string } | null> => {
    const uploadId = nanoid()
    const storage = getStorage()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${nanoid()}.${fileExtension}`
    const fileRef = storageRef(storage, `${folder}/${fileName}`)

    // Initialize upload progress
    uploads.value.set(uploadId, {
      fileName: file.name,
      progress: 0,
      uploading: true
    })

    try {
      const uploadTask = uploadBytesResumable(fileRef, file)

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            uploads.value.set(uploadId, {
              fileName: file.name,
              progress,
              uploading: progress < 100
            })
          },
          (error) => {
            uploads.value.set(uploadId, {
              fileName: file.name,
              progress: 0,
              uploading: false,
              error: error.message
            })
            reject(error)
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
              uploads.value.set(uploadId, {
                fileName: file.name,
                progress: 100,
                uploading: false,
                url: downloadURL
              })
              resolve({ url: downloadURL, fileName })
            } catch (error) {
              uploads.value.set(uploadId, {
                fileName: file.name,
                progress: 0,
                uploading: false,
                error: error instanceof Error ? error.message : 'Failed to get download URL'
              })
              reject(error)
            }
          }
        )
      })
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