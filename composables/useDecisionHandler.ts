import { storeToRefs } from 'pinia'
import { useGameDataStore } from '~/stores/gameDataStore'

const watcher = ref()

export const useDecisionHandler = () => {
  type KoikoiDecision = 'stop' | 'koikoi' | 'pending' | null

  const useDecision = (): Ref<KoikoiDecision> => useState('decision', () => null)

  const decision = useDecision()
  const getDecision = computed(() => decision.value)

  const decisionIsPending = computed(() => decision.value === 'pending')

  const koikoiIsCalled = computed(() => decision.value === 'koikoi')
  const callKoikoi = () => {
    decision.value = 'koikoi'
  }

  const stopIsCalled = computed(() => decision.value === 'stop')
  const callStop = () => {
    decision.value = 'stop'
  }

  const noCalls = computed(() => decision.value === null)

  const makeDecision = async (): Promise<KoikoiDecision> => {
    decision.value = 'pending'
    while (decisionIsPending.value) {
      console.log('Player is deciding...')
      await sleep(500)
    }
    if (decision.value) console.info(decision.value.toUpperCase(), 'was called.')
    return decision.value
  }

  const { roundOver, gameOver } = storeToRefs(useGameDataStore())

  if (!watcher.value) {
    console.debug('Setting decision watcher...')
    watcher.value = watch([roundOver, gameOver], () => {
      if (roundOver.value === false || gameOver.value) {
        decision.value = null
      }
    })
  }

  return {
    // Setters
    callKoikoi,
    callStop,
    // Getters (reactive)
    noCalls,
    koikoiIsCalled,
    stopIsCalled,
    decisionIsPending,
    getDecision,
    // Functions
    makeDecision,
  }
}
