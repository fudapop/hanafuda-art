<template>
  <Modal
    :open="open"
    :padded="true"
  >
    <template #title>
      <span v-if="currentFlow === 'menu'">
        {{ t('multiplayer.new_match') }}
      </span>
      <span v-else-if="currentFlow === 'create'">
        {{ t('multiplayer.create_game') }}
      </span>
      <span v-else-if="currentFlow === 'join'">
        {{ t('multiplayer.join_game') }}
      </span>
    </template>

    <template #description>
      <!-- Menu View -->
      <div
        v-if="currentFlow === 'menu'"
        class="flex flex-col gap-4 mt-4"
      >
        <p class="text-sm text-text-secondary">
          {{ t('multiplayer.choose_option') }}
        </p>

        <div class="flex flex-col gap-3">
          <!-- Create Game Option -->
          <button
            class="flex flex-col gap-2 p-4 text-left transition-all border-2 rounded-lg group border-text-secondary/30 hover:border-hanafuda-red hover:bg-hanafuda-red/5 active:scale-98"
            @click="currentFlow = 'create'"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 transition-colors rounded-lg bg-hanafuda-red/10 group-hover:bg-hanafuda-red/20"
              >
                <svg
                  class="w-6 h-6 text-hanafuda-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-text-primary">
                  {{ t('multiplayer.create_game') }}
                </h4>
                <p class="text-sm text-text-secondary">
                  {{ t('multiplayer.create_description') }}
                </p>
              </div>
            </div>
          </button>

          <!-- Join Game Option -->
          <button
            class="flex flex-col gap-2 p-4 text-left transition-all border-2 rounded-lg group border-text-secondary/30 hover:border-hanafuda-red hover:bg-hanafuda-red/5 active:scale-98"
            @click="currentFlow = 'join'"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center justify-center w-10 h-10 transition-colors rounded-lg bg-hanafuda-red/10 group-hover:bg-hanafuda-red/20"
              >
                <svg
                  class="w-6 h-6 text-hanafuda-red"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-text-primary">
                  {{ t('multiplayer.join_game') }}
                </h4>
                <p class="text-sm text-text-secondary">
                  {{ t('multiplayer.join_description') }}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Create Game Flow -->
      <CreateGameFlow
        v-else-if="currentFlow === 'create'"
        :open="open && currentFlow === 'create'"
        @close="handleClose"
        @game-started="handleGameStarted"
      />

      <!-- Join Game Flow -->
      <JoinGameFlow
        v-else-if="currentFlow === 'join'"
        :open="open && currentFlow === 'join'"
        @close="handleClose"
        @game-joined="handleGameJoined"
      />
    </template>

    <template #actions>
      <div
        v-if="currentFlow === 'menu'"
        class="flex justify-end gap-3 px-4 mt-6 sm:px-6"
      >
        <button
          class="px-6 py-2 text-sm font-medium transition-colors border rounded-lg border-text-secondary/30 text-text-secondary hover:bg-hanafuda-brown/10 active:scale-95"
          @click="handleClose"
        >
          {{ t('common.cancel') }}
        </button>
      </div>
      <div
        v-else
        class="flex justify-start gap-3 px-4 mt-6 sm:px-6"
      >
        <button
          class="px-4 py-2 text-sm font-medium transition-colors border rounded-lg border-text-secondary/30 text-text-secondary hover:bg-hanafuda-brown/10 active:scale-95"
          @click="backToMenu"
        >
          ← {{ t('common.back') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import CreateGameFlow from '../multiplayer/CreateGameFlow.vue'
import JoinGameFlow from '../multiplayer/JoinGameFlow.vue'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'close': []
  'game-created': [{ gameId: string; code: string }]
  'game-joined': [{ gameId: string }]
}>()

const currentFlow = ref<'menu' | 'create' | 'join'>('menu')

const { t } = useI18n()

// Reset to menu when modal is closed
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      currentFlow.value = 'menu'
    }
  },
)

const handleClose = () => {
  currentFlow.value = 'menu'
  emit('close')
}

const backToMenu = () => {
  currentFlow.value = 'menu'
}

const handleGameStarted = (gameId: string) => {
  // Game created and opponent joined - start the game
  emit('game-created', { gameId, code: '' })
  handleClose()
}

const handleGameJoined = (gameId: string) => {
  // Successfully joined a game - start the game
  emit('game-joined', { gameId })
  handleClose()
}
</script>
