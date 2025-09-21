import type { CardMapping } from '~/composables/useCardMapping'

export interface UploadItem {
  id: string
  bucket: string
  path: string
  file: File
  cardName: string
  uploadUrl?: string
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  progress: number
  error?: string
  retryCount: number
}

export interface UploadProgress {
  itemId: string
  progress: number
  status: UploadItem['status']
}

export interface UploadManagerState {
  queue: Map<string, UploadItem>
  isProcessing: boolean
  currentProgress: UploadProgress | null
  totalProgress: number
  completedCount: number
  failedCount: number
}

export const useFileUploadManager = () => {
  const { $toast } = useNuxtApp() as any

  // State management
  const state = reactive<UploadManagerState>({
    queue: new Map(),
    isProcessing: false,
    currentProgress: null,
    totalProgress: 0,
    completedCount: 0,
    failedCount: 0,
  })

  // Computed properties
  const queueSize = computed(() => state.queue.size)
  const hasActiveUploads = computed(() => state.isProcessing && state.queue.size > 0)
  const uploadProgress = computed(() => {
    if (state.queue.size === 0) return 100
    return Math.round(
      (state.completedCount / (state.completedCount + state.queue.size + state.failedCount)) * 100,
    )
  })

  // Generate unique file path for submission
  const generateFilePath = (cardName: string, file: File): string => {
    const timestamp = Date.now()
    const userId = 'anonymous' // Since users aren't signed in
    const extension = file.name.split('.').pop() || 'jpg'
    return `submissions/${userId}/${timestamp}/${cardName}.${extension}`
  }

  // Get presigned URL from server
  const getPresignedUrl = async (fileName: string, fileType: string, cardName: string) => {
    const { data, error } = await $fetch('/api/submissions/presigned-url', {
      method: 'POST',
      body: {
        fileName,
        fileType,
        cardName,
      },
    })

    if (error) {
      throw new Error(`Failed to get presigned URL: ${error}`)
    }

    return data
  }

  // Add file to upload queue
  const enqueue = (file: File, cardName: string, bucket = 'submissions') => {
    const id = crypto.randomUUID()
    const path = generateFilePath(cardName, file)

    const item: UploadItem = {
      id,
      bucket,
      path,
      file,
      cardName,
      status: 'pending',
      progress: 0,
      retryCount: 0,
    }

    state.queue.set(id, item)

    return {
      executeSideEffect: async (fn: (supabase: any) => Promise<void>) => {
        const existingItem = state.queue.get(id)
        if (existingItem) {
          existingItem.serverSideEffect = fn
          state.queue.set(id, existingItem)
        }
      },
    }
  }

  // Remove item from queue
  const dequeue = (id: string) => {
    const item = state.queue.get(id)
    if (item) {
      if (item.status === 'completed') {
        state.completedCount++
      } else if (item.status === 'failed') {
        state.failedCount++
      }
    }
    state.queue.delete(id)
  }

  // Upload single file using presigned URL
  const uploadFile = async (item: UploadItem): Promise<void> => {
    try {
      // Update item status
      item.status = 'uploading'
      state.queue.set(item.id, item)

      // Get presigned URL
      const presignedData = await getPresignedUrl(
        item.file.name,
        item.file.type,
        item.cardName
      )

      item.uploadUrl = presignedData.uploadUrl
      state.queue.set(item.id, item)

      // Upload file using fetch with progress tracking
      const response = await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: item.file,
        headers: {
          'Content-Type': item.file.type,
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      // Update progress to 100%
      item.progress = 100
      item.status = 'completed'
      state.queue.set(item.id, item)

      console.log(`Upload successful for ${item.cardName}`)
    } catch (error) {
      console.error(`Upload failed for ${item.cardName}:`, error)
      item.status = 'failed'
      item.error = error instanceof Error ? error.message : 'Unknown error'
      state.queue.set(item.id, item)
      throw error
    }
  }

  // Process upload queue
  const processQueue = async () => {
    if (state.isProcessing || state.queue.size === 0) return

    state.isProcessing = true
    const queueItems = Array.from(state.queue.values()).filter((item) => item.status === 'pending')

    // Process uploads with limited concurrency
    const concurrency = 3
    const chunks = []
    for (let i = 0; i < queueItems.length; i += concurrency) {
      chunks.push(queueItems.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            await uploadFile(item)

            // Execute server-side effect if defined
            if (item.serverSideEffect) {
              // Note: We don't have supabase client here anymore
              // You might want to call a server API instead
              console.log('Server-side effect would be executed here')
            }

            dequeue(item.id)
          } catch (error) {
            console.error(`Failed to upload ${item.cardName}:`, error)
            item.retryCount++

            // Retry logic
            if (item.retryCount < 3) {
              item.status = 'pending'
              state.queue.set(item.id, item)
            } else {
              dequeue(item.id)
              $toast.error(`Failed to upload ${item.cardName} after 3 attempts`)
            }
          }
        }),
      )
    }

    state.isProcessing = false
    state.currentProgress = null
  }

  // Start upload process
  const startUpload = () => {
    if (state.queue.size === 0) {
      $toast.warning('No files to upload')
      return
    }
    processQueue()
  }

  // Cancel all uploads
  const cancelUploads = () => {
    state.queue.forEach((item) => {
      if (item.status === 'uploading' || item.status === 'pending') {
        item.status = 'cancelled'
        state.queue.set(item.id, item)
      }
    })
    state.isProcessing = false
    state.currentProgress = null
  }

  // Clear completed uploads
  const clearCompleted = () => {
    const completedItems = Array.from(state.queue.values())
      .filter((item) => item.status === 'completed')
      .map((item) => item.id)

    completedItems.forEach((id) => dequeue(id))
  }

  // Upload card mappings (main entry point)
  const uploadCardMappings = async (mappings: CardMapping[]) => {
    // Clear existing queue
    state.queue.clear()
    state.completedCount = 0
    state.failedCount = 0

    // Add all mapped files to queue
    for (const mapping of mappings) {
      enqueue(mapping.file, mapping.cardName)
    }

    // Start upload process
    startUpload()
  }

  // Watch for queue changes to auto-process
  watch(
    () => state.queue.size,
    (newSize, oldSize) => {
      if (newSize > 0 && newSize !== oldSize && !state.isProcessing) {
        nextTick(() => processQueue())
      }
    },
  )

  return {
    // State
    queue: readonly(toRef(state, 'queue')),
    isProcessing: readonly(toRef(state, 'isProcessing')),
    currentProgress: readonly(toRef(state, 'currentProgress')),
    totalProgress: readonly(toRef(state, 'totalProgress')),
    completedCount: readonly(toRef(state, 'completedCount')),
    failedCount: readonly(toRef(state, 'failedCount')),

    // Computed
    queueSize,
    hasActiveUploads,
    uploadProgress,

    // Methods
    enqueue,
    dequeue,
    startUpload,
    cancelUploads,
    clearCompleted,
    uploadCardMappings,
  }
}
