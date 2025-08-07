import { onUnmounted } from 'vue'

/**
 * Composable for managing file object URLs with caching and automatic cleanup
 * Prevents memory leaks by tracking and revoking all created URLs on unmount
 */
export function useFileUrls() {
  // Cache for object URLs mapped by file reference
  const fileUrlCache = new Map<File, string>()

  /**
   * Get or create an object URL for a file
   * Returns cached URL if already exists, creates new one if not
   */
  const getFileUrl = (file: File): string => {
    // Check if we already have a URL for this file
    const existingUrl = fileUrlCache.get(file)
    if (existingUrl) {
      return existingUrl
    }

    // Create new URL and cache it
    const url = URL.createObjectURL(file)
    fileUrlCache.set(file, url)
    return url
  }

  /**
   * Manually revoke a specific file's URL
   * Useful if you know a file is no longer needed
   */
  const revokeFileUrl = (file: File): void => {
    const url = fileUrlCache.get(file)
    if (url) {
      URL.revokeObjectURL(url)
      fileUrlCache.delete(file)
    }
  }

  /**
   * Get the number of cached URLs (useful for debugging)
   */
  const getCachedUrlCount = (): number => {
    return fileUrlCache.size
  }

  // Cleanup all cached URLs when component unmounts
  onUnmounted(() => {
    fileUrlCache.forEach((url) => URL.revokeObjectURL(url))
    fileUrlCache.clear()
  })

  return {
    getFileUrl,
    revokeFileUrl,
    getCachedUrlCount,
  }
}
