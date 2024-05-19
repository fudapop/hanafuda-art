<template>
  <div :class="['absolute inset-0 h-full [--card-height:75px]', currentDesign]">
    <button
      type="button"
      title="Open/close all"
      class="fixed z-50 text-gray-200 bg-gray-400 rounded-md bottom-8 right-8 hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-yellow-300 focus:ring-offset-2"
      @click="openAll = !openAll"
    >
      <ChevronDownIcon :class="['w-7 h-7', openAll ? 'rotate-180' : '']" />
      <span class="sr-only">Expand/Collapse</span>
    </button>
    <div class="w-full max-w-lg p-2 mx-auto space-y-2 rounded-2xl">
      <HeadlessDisclosure as="div" v-for="yaku in allowedYaku" :key="yaku.name" v-slot="{ open }" v-show="yaku.cards.length > 0">
        <HeadlessDisclosureButton
          :class="[
            'relative grid w-full grid-cols-[repeat(2,1fr)_max-content] px-4 py-2 items-center text-sm font-medium text-left rounded-lg focus:outline-none focus-visible:ring focus-visible:ring-opacity-75',
            isComplete(yaku)
              ? 'text-green-900 bg-green-400 hover:bg-green-200 focus-visible:ring-green-500'
              : 'text-indigo-900 bg-indigo-100 hover:bg-indigo-200 focus-visible:ring-indigo-500',
          ]"
        >
          <span class="font-bold uppercase max-xs:text-xs whitespace-nowrap">
            {{ yaku.name }}
          </span>

          <CheckCircleIcon
            v-if="isComplete(yaku)"
            class="absolute w-6 h-6 -left-2 opacity-80"
          />
          <span
            v-else
            v-show="!(open || openAll)"
            class="absolute bottom-0 inline-flex mb-1 ml-4"
          >
            <span
              v-for="_ in yaku.cards.filter((card) => playerHas(card))"
              class="self-center w-3 h-1 ml-1 bg-green-400 rounded-full ring-1 ring-inset ring-green-500"
            ></span>
            <span
              v-for="_ in yaku.numRequired -
              yaku.cards.filter((card) => playerHas(card)).length"
              class="self-center w-3 h-1 ml-1 rounded-full ring-1 ring-inset ring-gray-400"
            ></span>
          </span>

          <span class="mr-4 text-right">
            <span class="font-semibold xs:text-lg">{{ yaku.points }}</span>
            <span v-if="yaku.points === 1" class="font-semibold align-top">+</span>
            points
          </span>
          <ChevronDownIcon
            :class="[
              'w-5 h-5 text-gray-500 float-right',
              open || openAll ? 'rotate-180' : '',
            ]"
          />
        </HeadlessDisclosureButton>

        <Transition
          appear
          enter-active-class="duration-100 origin-top"
          enter-from-class="-translate-y-4 opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="duration-100 origin-top"
          leave-from-class="opacity-100"
          leave-to-class="-translate-y-4 opacity-0"
        >
          <HeadlessDisclosurePanel
            static
            :key="`${openAll || open}`"
            :class="[
              'px-4 pt-2 pb-6 text-sm text-gray-900 dark:text-white',
              open || openAll ? '' : 'hidden',
            ]"
          >
            <p class="mb-2">
              {{ yaku.description.toString() }}
            </p>

            <div :class="['grid grid-cols-10 gap-1']">
              <div
                v-for="card in yaku.cards"
                :key="card"
                :class="{
                  'card overflow-hidden drop-shadow-sm relative [&:nth-child(n+11)]:-mt-8 [&:nth-child(n+11):nth-child(-n+20)]:ml-4': true,
                  'after:absolute after:inset-0 after:bg-black/60':
                    opponentHas(card) || playerHas(card),
                }"
              >
                <CardImage :card="card" :src="useCardDesign().getCardUrl(card)!" />
                <CheckCircleIcon
                  v-if="playerHas(card)"
                  class="absolute z-50 w-5 h-5 text-green-400 top-1 left-1"
                />
                <XCircleIcon
                  v-if="opponentHas(card)"
                  class="absolute z-50 w-5 h-5 text-red-400 top-1 left-1"
                />
              </div>
            </div>

            <p
              v-if="viewingsAllowed === 'limited' && viewingYaku.has(yaku.name)"
              class="mt-4 text-xs max-w-prose whitespace-nowrap"
            >
              <ExclamationCircleIcon class="inline w-4 h-auto mr-1 pointer-events-none" />
              Requires at least one other
              <span class="block pl-6"
                >completed yaku ( not
                {{
                  [...viewingYaku].filter((name) => name != yaku.name)[0].toUpperCase()
                }})
              </span>
            </p>
          </HeadlessDisclosurePanel>
        </Transition>
      </HeadlessDisclosure>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/vue/20/solid";
import { useCardStore } from "~/stores/cardStore";
import { useConfigStore } from "~/stores/configStore";
import { type CardName } from "~/utils/cards";
import { type Yaku, teyaku, viewingYaku } from "~/utils/yaku";

const cs = useCardStore();
const config = useConfigStore();

const openAll = ref(false);

const currentDesign = useCardDesign().useDesign();

const playerHas = toValue(computed(() => (card: CardName) => cs.collection.p1.has(card)));
const opponentHas = toValue(
  computed(() => (card: CardName) => cs.collection.p2.has(card))
);

const isComplete = (yaku: Yaku) => {
  return yaku.cards.filter((card) => playerHas(card)).length >= yaku.numRequired;
};

const viewingsAllowed = computed(() => config.allowViewingsYaku);

const allowedYaku = computed(() => {
  const yakuList = [...Object.values(YAKU)].filter(
    (yaku) => !teyaku.has(yaku.name)
  );
  if (viewingsAllowed.value === "none")
    return yakuList.filter((yaku) => !viewingYaku.has(yaku.name));
  return yakuList;
});
</script>
