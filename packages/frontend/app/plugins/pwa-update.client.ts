/**
 * Starts the PWA update flow once on the client.
 * The banner reads the same shared state.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.env.VITEST) return
  useAppUpdate()
})
