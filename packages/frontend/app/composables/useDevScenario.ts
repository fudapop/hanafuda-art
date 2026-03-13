import type { DevScenario } from '~/utils/dev-scenarios'

export const useDevScenario = () => {
  const localeRoute = useLocaleRoute()

  const applyScenario = (scenario: DevScenario) => {
    if (!import.meta.dev) return

    const { snapshot } = useGameResultsSnapshot()
    snapshot.value = scenario.snapshot

    const { isMultiplayerGame } = useLocalPlayerPerspective()
    isMultiplayerGame.value = scenario.snapshot.isMultiplayer

    navigateTo(localeRoute(scenario.route))
  }

  return { applyScenario }
}
