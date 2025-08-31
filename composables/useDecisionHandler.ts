import { storeToRefs } from 'pinia'
import { useGameDataStore } from '~/stores/gameDataStore'
import { usePlayerStore, type PlayerKey } from '~/stores/playerStore'

const watcher = ref()

export const useDecisionHandler = () => {
  type KoikoiDecision = 'stop' | 'koikoi' | 'pending' | null

  const ps = usePlayerStore()
  const useDecision = (): Ref<KoikoiDecision> => useState('decision', () => null)
  const useCalledBy = (): Ref<PlayerKey | null> => useState('calledBy', () => null)

  const decision = useDecision()
  const calledBy = useCalledBy()
  const getDecision = computed(() => decision.value)
  const getCaller = computed(() => calledBy.value)

  const decisionIsPending = computed(() => decision.value === 'pending')

  const koikoiIsCalled = computed(() => decision.value === 'koikoi')
  const callKoikoi = () => {
    calledBy.value = ps.activePlayer.id
    decision.value = 'koikoi'
    ds.logPlayerAction(ps.activePlayer.id, 'koi-koi')
  }

  const stopIsCalled = computed(() => decision.value === 'stop')
  const callStop = () => {
    calledBy.value = ps.activePlayer.id
    decision.value = 'stop'
    ds.logPlayerAction(ps.activePlayer.id, 'stop')
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

  const ds = useGameDataStore()
  const { roundOver, gameOver } = storeToRefs(ds)

  if (!watcher.value) {
    console.debug('Setting decision watcher...')
    watcher.value = watch([roundOver, gameOver], () => {
      if (roundOver.value === false || gameOver.value) {
        decision.value = null
        calledBy.value = null
      }
    })
  }

  const cleanup = () => {
    if (watcher.value) {
      watcher.value()
      watcher.value = null
    }
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
    getCaller,
    // Functions
    makeDecision,
    cleanup,
  }
}
