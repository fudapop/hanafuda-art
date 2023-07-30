<template>
  <HeadlessTransitionRoot appear :show="roundIsEnding">
    <HeadlessDialog as="div" class="relative z-10">
      <!-- BACKDROP -->
      <HeadlessTransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </HeadlessTransitionChild>

      <!-- PANEL -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex items-center justify-center min-h-full p-4 text-center">
          <HeadlessTransitionChild
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <!-- RESPONSIVE CONTAINER -->
            <div
              class="p-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-md shadow-xl w-full max-w-[800px]"
            >
              <!-- HEADER -->
              <div class="px-4 py-5 bg-white border-b border-gray-200 sm:px-6">
                <div
                  class="flex flex-wrap items-end justify-between -mt-2 -ml-4 sm:flex-nowrap"
                >
                  <HeadlessDialogTitle
                    as="h3"
                    class="text-lg font-semibold leading-6 text-gray-900"
                  >
                    {{ recordedWinner?.toUpperCase() }}
                    <span v-if="callDecision"> is deciding... </span>
                    <span v-else> wins </span>
                  </HeadlessDialogTitle>

                  <!-- BUTTONS -->
                  <!-- Warning is logged if no focusable elements rendered -->
                  <!-- Hidden during opponent decision -->
                  <div class="flex flex-shrink-0 gap-2 mt-2 ml-4">
                    <div
                      v-if="callDecision"
                      :class="{
                        'opacity-0 pointer-events-none': gs.players.p2.isActive,
                      }"
                    >
                      <button
                        type="button"
                        class="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-md shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        @click="$emit('stop')"
                      >
                        Stop
                      </button>
                      <button
                        v-show="handNotEmpty(gs.activePlayer.id)"
                        type="button"
                        class="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        @click="$emit('koikoi')"
                      >
                        Koi-Koi
                      </button>
                    </div>
                    <button
                      v-else
                      type="button"
                      class="relative inline-flex items-center px-3 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      @click="$emit('next')"
                    >
                      Next Round
                    </button>
                  </div>
                </div>
              </div>
              <!-- END HEADER -->

              <!-- YAKU LIST -->
              <ul
                role="list"
                class="min-w-[320px] grid p-2 gap-4 md:grid-cols-[repeat(2,minmax(360px,1fr))]"
                v-if="roundNotADraw"
              >
                <li v-for="yaku in completed" :key="yaku" class="relative">
                  <div
                    class="block w-full overflow-hidden rounded-sm group aspect-h-7 aspect-w-10 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 focus-within:ring-offset-gray-100"
                  >
                    <!-- CARD IMAGES -->
                    <div class="[--card-height:60px] w-max pointer-events-none">
                      <ListGrid :cols="'auto'" :rows="1" flow="column">
                        <CardList
                          :cards="YAKU[yaku].find(collection[recordedWinner!])"
                          :stack="true"
                        />
                      </ListGrid>
                    </div>
                  </div>
                  <!-- YAKU TITLE -->
                  <p
                    class="block mt-2 text-sm font-semibold tracking-wide text-gray-900 truncate pointer-events-none"
                  >
                    {{ yaku.toUpperCase() }}
                  </p>
                  <!-- YAKU POINTS -->
                  <p class="block text-sm font-medium text-gray-500 pointer-events-none">
                    {{ YAKU[yaku as
                      YakuName].points }}
                    points
                  </p>
                </li>
              </ul>
            </div>
          </HeadlessTransitionChild>
        </div>
      </div>
    </HeadlessDialog>
  </HeadlessTransitionRoot>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCardStore } from "~/stores/cardStore";
import { YAKU, YakuName } from "~/scripts/yaku";
import { useGlobalStore } from "~/stores/globalStore";

defineEmits(["stop", "koikoi", "next"]);

const callDecision: Ref<boolean> = useState("decision");
const gameOver: Ref<boolean> = useState("gameover");

const { collection, handNotEmpty } = storeToRefs(useCardStore());

const gs = useGlobalStore();
const { lastRoundResult } = storeToRefs(gs);

const completed = computed(() => lastRoundResult.value?.yaku);

const recordedWinner = computed(() => lastRoundResult.value?.winner);

const roundNotADraw = computed(() => completed.value?.length && recordedWinner);

const roundIsEnding = computed(() => callDecision.value || gameOver.value);
</script>

<style scoped></style>
