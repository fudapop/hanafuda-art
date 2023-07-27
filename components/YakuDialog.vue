<template>
  <div>
    <HeadlessTransitionRoot appear :show="callDecision" as="template">
      <HeadlessDialog as="div" class="relative z-10">
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

        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4 text-center">
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
                class="w-full max-w-md transform overflow-hidden rounded-md bg-white p-6 text-left align-middle shadow-xl transition-all"
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
                  class="w-max pointer-events-none"
                >
                  <div v-for="yaku in completed" class="flex flex-col">
                    <h2 class="font-semibold">
                      {{ yaku.toUpperCase() }}: {{ YAKU[yaku].points }} points
                    </h2>
                    <div class="[--card-h:60px] w-max">
                      <ListGrid :cols="'auto'" :rows="1" flow="column">
                        <CardList
                          :cards="YAKU[yaku].find(collection[lastRoundResult.winner])"
                          :stack="true"
                        />
                      </ListGrid>
                    </div>
                  </div>
                </div>

                <div class="flex gap-4 mt-4">
                  <button
                    type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    @click="$emit('stop')"
                  >
                    STOP!
                  </button>
                  <button
                    type="button"
                    class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
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
const { collection } = storeToRefs(useCardStore());

const { lastRoundResult } = storeToRefs(gs);

const completed = computed(() => lastRoundResult.value?.yaku);
</script>

<style scoped></style>
