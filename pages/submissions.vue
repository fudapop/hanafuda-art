<template>
  <div class="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          Submit Your Design
        </h1>
        <p class="text-lg text-gray-600">
          Share your artwork with the Fudapop community. We'd love to see your creative designs!
        </p>
      </div>

      <div class="bg-white shadow-xl rounded-lg p-8">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- File Upload Zone -->
          <div class="mb-8">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Upload Your Design
            </label>
            <div
              @drop="handleFileDrop"
              @dragover.prevent
              @dragenter.prevent
              @dragleave="isDragOver = false"
              @dragover="isDragOver = true"
              :class="[
                'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                isDragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300',
                uploadedFile ? 'border-green-400 bg-green-50' : ''
              ]"
            >
              <input
                ref="fileInput"
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                @change="handleFileSelect"
                class="hidden"
              />
              
              <div v-if="!uploadedFile && !isUploading">
                <Icon name="heroicons:cloud-arrow-up" class="mx-auto h-12 w-12 text-gray-400" />
                <div class="mt-4">
                  <button
                    type="button"
                    @click="$refs.fileInput.click()"
                    class="text-purple-600 hover:text-purple-500 font-medium"
                  >
                    Click to upload
                  </button>
                  <span class="text-gray-500"> or drag and drop</span>
                </div>
                <p class="mt-2 text-sm text-gray-500">
                  PNG, JPEG, or WebP up to 10MB
                </p>
              </div>

              <div v-else-if="isUploading" class="space-y-4">
                <Icon name="heroicons:arrow-path" class="mx-auto h-12 w-12 text-purple-600 animate-spin" />
                <div v-for="upload in uploads" :key="upload.fileName">
                  <p class="text-sm font-medium text-gray-700">{{ upload.fileName }}</p>
                  <div class="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      class="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${upload.progress}%` }"
                    ></div>
                  </div>
                  <p class="mt-1 text-xs text-gray-500">{{ Math.round(upload.progress) }}% uploaded</p>
                </div>
              </div>

              <div v-else-if="uploadedFile" class="space-y-4">
                <Icon name="heroicons:check-circle" class="mx-auto h-12 w-12 text-green-600" />
                <div>
                  <p class="text-sm font-medium text-gray-700">{{ selectedFile?.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatFileSize(selectedFile?.size || 0) }}</p>
                </div>
                <button
                  type="button"
                  @click="clearFile"
                  class="text-red-600 hover:text-red-500 text-sm font-medium"
                >
                  Remove file
                </button>
              </div>

              <div v-if="fileError" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p class="text-sm text-red-600">{{ fileError }}</p>
              </div>
            </div>
          </div>

          <!-- Artist Information Form -->
          <div class="space-y-6">
            <div>
              <label for="artistName" class="block text-sm font-medium text-gray-700 mb-2">
                Artist Name <span class="text-red-500">*</span>
              </label>
              <input
                id="artistName"
                v-model="formData.artist_name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Your name or artist alias"
              />
            </div>

            <div>
              <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                Description <span class="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                v-model="formData.description"
                rows="4"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Tell us about your artwork, inspiration, or techniques used..."
              ></textarea>
            </div>

            <!-- Social Media Links -->
            <div class="space-y-4">
              <h3 class="text-lg font-medium text-gray-900">Social Media & Portfolio (Optional)</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="instagram" class="block text-sm font-medium text-gray-700 mb-1">
                    Instagram
                  </label>
                  <input
                    id="instagram"
                    v-model="formData.social_media_links.instagram"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://instagram.com/yourhandle"
                  />
                </div>

                <div>
                  <label for="twitter" class="block text-sm font-medium text-gray-700 mb-1">
                    Twitter/X
                  </label>
                  <input
                    id="twitter"
                    v-model="formData.social_media_links.twitter"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://twitter.com/yourhandle"
                  />
                </div>

                <div>
                  <label for="website" class="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    id="website"
                    v-model="formData.social_media_links.website"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <label for="portfolio" class="block text-sm font-medium text-gray-700 mb-1">
                    Portfolio
                  </label>
                  <input
                    id="portfolio"
                    v-model="formData.social_media_links.portfolio"
                    type="url"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://yourportfolio.com"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-6">
            <button
              type="submit"
              :disabled="!uploadedFile || !formData.artist_name || !formData.description || isSubmitting"
              :class="[
                'w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors',
                (!uploadedFile || !formData.artist_name || !formData.description || isSubmitting)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500'
              ]"
            >
              <Icon 
                v-if="isSubmitting" 
                name="heroicons:arrow-path" 
                class="w-4 h-4 mr-2 animate-spin" 
              />
              {{ isSubmitting ? 'Submitting...' : 'Submit Design' }}
            </button>
          </div>
        </form>

        <!-- Success Message -->
        <div v-if="submissionSuccess" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div class="flex">
            <Icon name="heroicons:check-circle" class="h-5 w-5 text-green-400" />
            <div class="ml-3">
              <h3 class="text-sm font-medium text-green-800">
                Submission Successful!
              </h3>
              <p class="mt-1 text-sm text-green-700">
                Thank you for your submission! We'll review your design and get back to you soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useFileUpload } from '~/composables/useFileUpload'
import type { SubmissionFormData } from '~/types/submissions'
import { useToast } from 'vue-toastification'

const toast = useToast()

// File upload composable
const { uploads, isUploading, uploadFile, validateFile, clearUploads } = useFileUpload()

// Form state
const formData = reactive<SubmissionFormData>({
  artist_name: '',
  description: '',
  social_media_links: {
    instagram: '',
    twitter: '',
    website: '',
    portfolio: ''
  }
})

// Component state
const isDragOver = ref(false)
const selectedFile = ref<File | null>(null)
const uploadedFile = ref<{ url: string; fileName: string } | null>(null)
const fileError = ref('')
const isSubmitting = ref(false)
const submissionSuccess = ref(false)
const fileInput = ref<HTMLInputElement>()

// File handling methods
const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const handleFile = async (file: File) => {
  fileError.value = ''
  
  // Validate file
  const validation = validateFile(file)
  if (!validation.valid) {
    fileError.value = validation.error || 'Invalid file'
    return
  }

  selectedFile.value = file
  
  try {
    const result = await uploadFile(file)
    if (result) {
      uploadedFile.value = result
      toast.success('File uploaded successfully!')
    }
  } catch (error) {
    fileError.value = error instanceof Error ? error.message : 'Upload failed'
    toast.error('Failed to upload file')
  }
}

const clearFile = () => {
  selectedFile.value = null
  uploadedFile.value = null
  fileError.value = ''
  clearUploads()
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Form submission
const handleSubmit = async () => {
  if (!uploadedFile.value || !formData.artist_name || !formData.description) {
    toast.error('Please fill in all required fields and upload a file')
    return
  }

  isSubmitting.value = true

  try {
    const response = await $fetch('/api/submissions', {
      method: 'POST',
      body: {
        artist_name: formData.artist_name,
        description: formData.description,
        social_media_links: formData.social_media_links,
        file_name: uploadedFile.value.fileName,
        file_url: uploadedFile.value.url,
        file_size: selectedFile.value?.size || 0,
        mime_type: selectedFile.value?.type || 'image/jpeg'
      }
    })

    if (response.success) {
      submissionSuccess.value = true
      toast.success('Submission sent successfully!')
      
      // Reset form
      Object.assign(formData, {
        artist_name: '',
        description: '',
        social_media_links: {
          instagram: '',
          twitter: '',
          website: '',
          portfolio: ''
        }
      })
      clearFile()
    }
  } catch (error) {
    console.error('Submission error:', error)
    toast.error('Failed to submit. Please try again.')
  } finally {
    isSubmitting.value = false
  }
}

// SEO
useHead({
  title: 'Submit Your Design - Fudapop',
  meta: [
    { name: 'description', content: 'Share your artwork with the Fudapop community. Submit your creative designs and get featured!' }
  ]
})
</script>