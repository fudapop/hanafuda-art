import { computed } from 'vue'
import type { PlayerKey } from '~~/stores/playerStore'

export const useLocalPlayerPerspective = () => {
  const localKey = useState<PlayerKey>('local-player-key', () => 'p1')
  const isMultiplayerGame = useState<boolean>('is-multiplayer-game', () => false)

  const selfKey = computed<PlayerKey>(() => localKey.value)
  const opponentKey = computed<PlayerKey>(() => (localKey.value === 'p1' ? 'p2' : 'p1'))

  return {
    localKey,
    selfKey,
    opponentKey,
    isMultiplayerGame,
  }
}
