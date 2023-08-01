<template>
  <HeadlessTransitionRoot appear :show="show" unmount>
    <HeadlessDialog class="relative z-10">
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
                    <span v-if="decisionIsPending"> is deciding... </span>
                  </HeadlessDialogTitle>

                  <!-- BUTTONS -->
                  <!-- Warning is logged if no focusable elements rendered -->
                  <!-- Hidden during opponent decision -->
                  <div
                    v-if="decisionIsPending"
                    :class="{
                      'flex flex-shrink-0 gap-2 ml-4': true,
                      'opacity-0 pointer-events-none': players.p2.isActive,
                    }"
                  >
                    <Button button-class="secondary" :action="callStop"> Stop </Button>
                    <Button
                      v-show="handNotEmpty(activePlayer.id)"
                      button-class="primary"
                      :action="callKoikoi"
                    >
                      Koi-Koi
                    </Button>
                  </div>
                  <div v-else v-show="stopIsCalled">
                    <Button :action="() => $emit('next')"> Next Round </Button>
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
                    {{ YAKU[yaku as YakuName].points }}
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
import { useGlobalStore } from "~/stores/globalStore";
import { YAKU, YakuName } from "~/scripts/yaku";

const { show } = defineProps<{ show: boolean }>();

defineEmits(["next"]);

const { decisionIsPending, callKoikoi, callStop, stopIsCalled } = useDecisionHandler();

const { collection, handNotEmpty } = storeToRefs(useCardStore());

const { lastRoundResult, players, activePlayer } = storeToRefs(useGlobalStore());

const completed = computed(() => lastRoundResult.value?.yaku);

const recordedWinner = computed(() => lastRoundResult.value?.winner);

const roundNotADraw = computed(() => completed.value?.length && recordedWinner);
</script>

<style scoped></style>
