<template>
  <!-- Vertical panel group -->
  <UiResizablePanelGroup
    direction="vertical"
    class="fixed left-0 max-w-sm min-w-xs top-16 lg:top-32 max-h-[50vh] pointer-events-none"
    @mouseenter="isMouseOver = true"
    @mouseleave="isMouseOver = false"
  >
    <!-- Vertical panel -->
    <UiResizablePanel
      ref="vPanelRef"
      collapsible
      :collapsed-size="COLLAPSED_HEIGHT"
      :default-size="panelState.height"
      :min-size="COLLAPSED_HEIGHT"
      @collapse="panelState.collapsed = true"
      @expand="panelState.collapsed = false"
      @resize="panelState.height = $event"
    >
      <!-- Horizontal panel group -->
      <UiResizablePanelGroup
        id="event-log-group"
        direction="horizontal"
        class="h-full"
      >
        <!-- Horizontal panel -->
        <UiResizablePanel
          ref="hPanelRef"
          collapsible
          :collapsed-size="0"
          :default-size="panelState.width"
          :min-size="MIN_WIDTH"
          :max-size="MAX_WIDTH"
          @collapse="panelState.hidden = true"
          @expand="panelState.hidden = false"
          @resize="panelState.width = $event"
        >
          <div
            ref="scrollRef"
            :class="[
              'grid h-full overflow-y-auto text-sm text-white bg-black/50 no-scrollbar rounded-br-md pointer-events-auto',
            ]"
          >
            <div
              v-for="log in history"
              :key="log.timestamp"
              class="grid h-12 flex-shrink-0 grid-cols-2 gap-1 px-4 mb-5"
            >
              <template v-if="log.type === 'player'">
                <div :class="getPlayerColor(log.player)">
                  <div class="flex items-start gap-1 flex-wrap">
                    <span class="uppercase">{{ log.player }}</span>
                    <span>{{ actionMap[log.action] }}</span>
                    <span
                      v-if="log.yaku"
                      class="ml-2 uppercase"
                      >{{ log.yaku }}</span
                    >
                  </div>
                  <span class="text-xs text-gray-300">{{
                    new Date(log.timestamp * 1000).toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false,
                    })
                  }}</span>
                </div>
                <ul
                  v-if="log.cards.length > 0"
                  :class="[
                    'flex items-start h-full gap-1 py-1 min-h-12',
                    log.cards.length > 4 && 'flex-wrap',
                  ]"
                >
                  <li
                    v-for="card in log.cards"
                    :key="card"
                    :class="[
                      'overflow-hidden rounded-full place-content-center',
                      log.cards.length > 4 ? 'w-6 h-6' : 'w-10 h-10',
                    ]"
                  >
                    <CardImage
                      :card="card"
                      :src="getCardUrl(card)"
                    />
                  </li>
                </ul>
              </template>
              <template v-else>
                <div class="h-full col-span-2 text-center text-gray-300 place-content-center">
                  {{ log.message }}
                </div>
              </template>
            </div>
          </div>
        </UiResizablePanel>
        <!-- Horizontal handle -->
        <UiResizableHandle class="w-0" />
        <UiResizablePanel class="pointer-events-none">
          <div
            class="flex flex-col items-start h-max bg-black/30 rounded-br-md w-max pointer-events-auto"
          >
            <UiButton
              v-if="!hPanelRef?.isCollapsed"
              variant="ghost"
              class="transition-all duration-300 rounded-none rounded-br-md text-white/80 hover:bg-black/50 hover:text-white"
              size="icon"
              @click="hideLogPanel"
            >
              <Icon
                name="mdi:eye-off"
                class="w-4 h-4"
              />
            </UiButton>
            <UiButton
              v-else
              variant="ghost"
              class="transition-all duration-300 rounded-none rounded-br-md text-white/80 hover:bg-black/50 hover:text-white"
              size="icon"
              @click="showLogPanel"
            >
              <Icon name="mdi:format-list-bulleted" />
            </UiButton>
            <template v-if="!hPanelRef?.isCollapsed">
              <UiButton
                v-if="!vPanelRef?.isCollapsed"
                variant="ghost"
                class="transition-all duration-300 rounded-none rounded-br-md text-white/80 hover:bg-black/50 hover:text-white"
                size="icon"
                @click="collapseLogPanel"
              >
                <Icon
                  name="mdi:arrow-collapse-vertical"
                  class="w-4 h-4"
                />
              </UiButton>
              <UiButton
                v-else
                variant="ghost"
                class="transition-all duration-300 rounded-none rounded-br-md text-white/80 hover:bg-black/50 hover:text-white"
                size="icon"
                @click="expandLogPanel"
              >
                <Icon
                  name="mdi:arrow-expand-vertical"
                  class="w-4 h-4"
                />
              </UiButton>
            </template>
          </div>
        </UiResizablePanel>
      </UiResizablePanelGroup>
    </UiResizablePanel>
    <!-- Vertical handle -->
    <UiResizableHandle
      class="bg-transparent"
      :with-handle="!hPanelRef?.isCollapsed && isMouseOver"
    />
    <UiResizablePanel class="pointer-events-none" />
  </UiResizablePanelGroup>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'
import type { ResizablePanel } from '~/components/ui/resizable'
import { useCardDesign } from '~/composables/useCardDesign'
import { useGameDataStore } from '~/stores/gameDataStore'

const { getCardUrl } = useCardDesign()
const { locale } = useI18n()
const ds = useGameDataStore()
const history = computed(() => ds.eventHistory)

const DEFAULT_HEIGHT = 48
const COLLAPSED_HEIGHT = 20
const DEFAULT_WIDTH = 70
const MIN_WIDTH = 50
const MAX_WIDTH = 90

const vPanelRef = ref<typeof ResizablePanel | null>(null)
const hPanelRef = ref<typeof ResizablePanel | null>(null)
const scrollRef = ref<HTMLElement | null>(null)
const isMouseOver = ref(false)
const panelState = useStorage(
  'event-log-state',
  {
    collapsed: false,
    hidden: false,
    height: DEFAULT_HEIGHT,
    width: DEFAULT_WIDTH,
  },
  localStorage,
  {
    mergeDefaults: true,
  },
)

const collapseLogPanel = () => {
  vPanelRef.value?.collapse()
}

const expandLogPanel = () => {
  vPanelRef.value?.expand()
}

const hideLogPanel = () => {
  hPanelRef.value?.collapse()
}

const showLogPanel = () => {
  hPanelRef.value?.expand()
}

const actionMap = {
  'discard': 'discarded',
  'match': 'matched',
  'draw': 'drew',
  'stop': 'called STOP',
  'koi-koi': 'called KOI-KOI',
  'complete': 'completed',
  'end-round': 'ended round',
  'end-game': 'ended game',
}

const getPlayerColor = (player?: string) => {
  if (player === 'p1') return 'text-blue-200'
  if (player === 'p2') return 'text-red-200'
  return 'text-gray-300'
}

onMounted(() => {
  watch(
    ds.eventHistory,
    () => {
      if (!isMouseOver.value && scrollRef.value) {
        nextTick(() => {
          scrollRef.value?.scrollTo({
            top: scrollRef.value.scrollHeight - scrollRef.value.clientHeight,
            behavior: 'smooth',
          })
        })
      }
    },
    { deep: true },
  )
})
</script>
