export const GAME_OPTIONS_TABS = ['Design', 'Yaku List', 'Gameplay', 'Profile'] as const
export type GameOptionsTab = (typeof GAME_OPTIONS_TABS)[number]

export const useOptionsPanel = () => {
  const isOpen = useState('options-panel', () => false)
  const currentTab = useState<GameOptionsTab>('options-panel-tab', () => 'Design')
  const currentTabIndex = computed(() => GAME_OPTIONS_TABS.indexOf(currentTab.value))

  const openOptions = (tab: GameOptionsTab = 'Design') => {
    isOpen.value = true
    currentTab.value = tab
  }

  const closeOptions = () => {
    isOpen.value = false
  }

  const toggleOptions = () => {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen: readonly(isOpen),
    currentTab: readonly(currentTab),
    currentTabIndex: readonly(currentTabIndex),
    openOptions,
    closeOptions,
    toggleOptions,
  }
}
