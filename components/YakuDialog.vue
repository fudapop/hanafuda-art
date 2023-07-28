<template>
  <div>
    <HeadlessTransitionRoot appear :show="callDecision" as="template">
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
              as="template"
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <div
                class="w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white rounded-md shadow-xl"
              >
                <HeadlessDialogTitle
                  as="h3"
                  class="text-lg font-medium leading-6 text-gray-900"
                >
                  {{ lastRoundResult?.winner?.toUpperCase() }}
                </HeadlessDialogTitle>
                <div class="my-2">
                  <p class="text-sm text-gray-500">Call Koi-Koi?</p>
                </div>

                <div
                  v-if="completed?.length && lastRoundResult?.winner"
                  class="pointer-events-none w-max"
                >
                  <div v-for="yaku in completed" class="flex flex-col">
                    <h2 class="font-semibold">
                      {{ yaku.toUpperCase() }}: {{ YAKU[yaku].points }} points
                    </h2>
                    <div class="[--card-height:60px] w-max">
                      <ListGrid :cols="'auto'" :rows="1" flow="column">
                        <CardList
                          :cards="YAKU[yaku].find(collection[lastRoundResult.winner])"
                          :stack="true"
                        />
                      </ListGrid>
                    </div>
                  </div>
                </div>
                <!-- BUTTONS -->
                <!-- Warning is logged if no focusable elements rendered -->
                <!-- Hidden during opponent decision -->
                <div :class="{
                  'flex gap-4 mt-4': true, 
                  'opacity-0 pointer-events-none': gs.activePlayer.id === 'p2',
                  }">
                  <button
                    type="button"
                    class="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    @click="$emit('stop')"
                  >
                    STOP!
                  </button>
                  <!-- Koi-koi button hidden if hand is empty -->
                  <button
                    v-show="handNotEmpty(gs.activePlayer.id)"
                    type="button"
                    class="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    @click="$emit('koikoi')"
                  >
                    KOI-KOI!
                  </button>
                </div>
              </div>
            </HeadlessTransitionChild>
          </div>
        </div>
      </HeadlessDialog>
    </HeadlessTransitionRoot>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useCardStore } from "~/stores/cardStore";
import { YAKU } from "~/scripts/yaku";
import { useGlobalStore } from "~/stores/globalStore";

defineEmits(["stop", "koikoi"]);

const callDecision: Ref<boolean> = useState("decision");
const gs = useGlobalStore();
const { collection, handNotEmpty } = storeToRefs(useCardStore());

const { lastRoundResult } = storeToRefs(gs);

const completed = computed(() => lastRoundResult.value?.yaku);
</script>

<style scoped></style>
