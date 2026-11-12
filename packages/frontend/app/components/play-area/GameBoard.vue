<template>
  <div class="board-fit relative h-full min-h-0 min-w-0">
    <div
      v-show="showLoader"
      class="fixed top-1/3 -translate-y-1/2 inset-x-0 mx-auto pointer-events-none z-1"
    >
      <slot name="loader" />
    </div>

    <div
      class="board-stack"
      data-board
    >
      <div
        class="board-opponent-slot min-w-0"
        data-board-opponent-hand
      >
        <OpponentArea />
      </div>

      <div
        class="min-w-0"
        data-board-opponent-collection
      >
        <div class="board-collection fit-cards">
          <CollectionArea
            :player="opponentKey"
            @completed="emit('completed', $event)"
          />
        </div>
      </div>

      <div
        class="board-field-center"
        data-board-field
      >
        <div class="board-field fit-cards mx-auto isolate min-w-0">
          <div
            v-click-disabled:unless="fieldEnabled"
            class="board-field-grid py-2 sm:py-3"
          >
            <Deck />
            <FieldDisplay />
          </div>
        </div>
      </div>

      <div
        class="min-w-0"
        data-board-player-collection
      >
        <div class="board-collection fit-cards">
          <CollectionArea
            :player="selfKey"
            @completed="emit('completed', $event)"
          />
        </div>
      </div>

      <div
        :class="['min-w-0 transition-opacity duration-200', handDimmed && 'opacity-80']"
        data-board-player-hand
      >
        <div class="board-hand fit-cards py-2 sm:py-3">
          <HandDisplay
            :id="selfKey"
            :can-interact="handEnabled"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompletionEvent } from '~/components/play-area/CollectionArea.vue'

withDefaults(
  defineProps<{
    showLoader?: boolean
    fieldEnabled?: boolean
    handEnabled?: boolean
    handDimmed?: boolean
  }>(),
  {
    showLoader: false,
    fieldEnabled: false,
    handEnabled: false,
    handDimmed: false,
  },
)

const emit = defineEmits<{
  completed: [data: CompletionEvent]
}>()

const { selfKey, opponentKey } = useLocalPlayerPerspective()
</script>
