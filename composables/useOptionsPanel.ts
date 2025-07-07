export const useOptionsPanel = () => {
  const isOpen = useState('options-panel', () => false)

  const openOptions = () => {
    isOpen.value = true
  }

  const closeOptions = () => {
    isOpen.value = false
  }

  const toggleOptions = () => {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen: readonly(isOpen),
    openOptions,
    closeOptions,
    toggleOptions,
  }
}
