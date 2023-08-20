<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { CompletedYaku, YakuName } from '~/utils/yaku';
import { useGameDataStore } from '~/stores/gameDataStore';
import { useCardStore } from '~/stores/cardStore';
import { useConfigStore } from '~/stores/configStore';
import { CardName } from '~/utils/cards';

const cs = useCardStore();
const ds = useGameDataStore();
const config = useConfigStore();

const { collection } = storeToRefs(cs);
const playerHas = computed(() => (card: CardName) => collection.value.p1.has(card))
const opponentHas = computed(() => (card: CardName) => collection.value.p2.has(card))

const completedYaku = toValue(computed(() => ds.getCurrent.result?.completedYaku as CompletedYaku[]));

const viewingsAllowed = computed(() => config.allowViewingsYaku);
const restrictedSet = new Set(["hanami-zake", "tsukimi-zake"]);

function isComplete(yakuName: YakuName) {
  if (completedYaku && Array.from(completedYaku).find(yaku => yaku.name === yakuName)) return "complete";
  else return "";
}

function allowedYaku() {
  const yakuList = [...Object.values(YAKU)].filter(yaku => !["teshi", "kuttsuki"].includes(yaku.name))
  if (viewingsAllowed.value) return yakuList;
  return yakuList.filter((yaku) => !restrictedSet.has(yaku.name));
}
</script>

<template>
  <div class="absolute inset-0 m-auto h-full [--card-height:60px]">
    <div v-if="collection" id="progress-screen"
      class="relative flex flex-col items-center w-full pt-16 overflow-x-hidden text-gray-900 bg-gray-100 dark:bg-gray-700 dark:text-white">
      <div v-for="(yaku, index) in allowedYaku()" :key="index" class="yaku-progress basis-full sm:basis-1/2">
        <h1 :class="`yaku-name ${isComplete(yaku.name)} text-indigo-600 dark:text-yellow-300 uppercase font-semibold`">
          {{ yaku.name }}
        </h1>
        <nuxt-img v-if="isComplete(yaku.name)" src="/images/coin.webp" alt="coin for a completed yaku" loading="lazy"
          class="absolute coin" />
        <h2 class="yaku-points">
          {{ yaku.points }} <span class="text-lg">{{ `${yaku.points === 1 ? " point" : " points"}` }}</span>
        </h2>
        <template v-if="yaku.description">
          <p v-for="line in yaku.description" :key="line" class="yaku-description whitespace-nowrap">
            {{ line }}
          </p>
        </template>
        <div v-if="yaku.cards" :class="['mt-1 yaku-cards', useCardDesign().useDesign().value]">
          <div v-for="card in yaku.cards" :class="{
            'card drop-shadow-md hover:after:bg-gray-500 hover:after:text-white': true,
            'opacity-50 translate-y-1': !playerHas(card),
            'opacity-100 grayscale scale-90 translate-y-2': opponentHas(card),
          }" :data-name="card">
            <CardImage :key="card" :src="useCardDesign().getCardUrl(card)!" :card="card" />
          </div>
        </div>
        <p v-if="viewingsAllowed === 'limited' &&
          restrictedSet.has(yaku.name) &&
          completedYaku
          " class="mt-4 text-xs note max-w-prose whitespace-nowrap">
          <Icon name="mdi:info-outline" class="mr-1 pointer-events-none" />
          Requires at least one other<br /><span class="pl-6">completed yaku ( not
            {{ [...restrictedSet].filter((name) => name != yaku.name)[0].toUpperCase() }}
            )</span>
        </p>
      </div>
      <div id="legend"
        :class="['absolute flex items-center gap-5 text-xs top-3 inset-x-0 mx-auto w-max origin-top-left [--card-height:40px]', useCardDesign().useDesign().value]">
        <div>
          <CardImage :src="useCardDesign().getCardUrl('kiri-no-kasu-1')!" card="kiri-no-kasu-1"
            class="scale-90 translate-y-2 opacity-100 card grayscale" />
          <p class="text-gray-900 dark:text-white ">uncollectible</p>
        </div>
        <div>
          <CardImage :src="useCardDesign().getCardUrl('kiri-no-kasu-1')!" card="kiri-no-kasu-1" class="translate-y-1 opacity-50 card" />
          <p class="text-gray-900 dark:text-white ">collectible</p>
        </div>
        <div>
          <CardImage :src="useCardDesign().getCardUrl('kiri-no-kasu-1')!" card="kiri-no-kasu-1" class="card" />
          <p class="text-gray-900 dark:text-white ">collected</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
#legend {
  transform-origin: bottom right;
  transition: scale 0.3s;
  letter-spacing: 0.05rem;

  &>div {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    align-items: center;
  }

  & p {
    margin-top: -0.5rem;
    background: var(--menu-gray);
    z-index: 1;
  }
}

.yaku-progress {
  width: 400px;
  height: max-content;
  padding: 1.5rem;
  padding-right: 5rem;
  font-size: small;
  position: relative;
  display: grid;
  grid-template-columns: 1fr 100px;
  grid-template-areas:
    "name points"
    "desc desc"
    "cards cards"
    "note note";
}

#progress-screen {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;

}

.yaku-name {
  grid-area: name;
  display: flex;
  align-items: center;
}

.note {
  grid-area: note;
  transition: scale 0.3s;
  transform-origin: left;

  &:hover {
    scale: 1.3;
  }
}

.yaku-points {
  grid-area: points;
  text-align: right;
  padding-right: 2rem;
  font-size: large;
  display: flex;
  align-items: center;
  gap: 0.2rem
}

.yaku-description {
  grid-area: desc;
}

.yaku-cards {
  grid-area: cards;
  max-width: 320px;
  display: flex;
  gap: 0.3rem;
  justify-content: flex-start;
  flex-wrap: wrap;

  &>* {
    --card-width: 50px;
    position: relative;

    &[data-name]::after {
      content: "";
      position: absolute;
      display: block;
      top: 100%;
      left: 90%;
      transform: translate(-50%, -50%);
      /* color: lightgoldenrodyellow; */
      font-size: x-small;
      padding: 0.5em;
      text-transform: uppercase;
      text-align: center;
      min-width: 100%;
      white-space: nowrap;
      z-index: 2;
    }

    &[data-name]:hover::after {
      content: attr(data-name);
      /* background-color: var(--menu-gray); */
      opacity: 1;
    }
  }
}

.coin {
  height: 24px;
  width: 24px;
  top: 1.5rem;
  left: 50%;
}

.unavailable {
  position: relative;
  rotate: -2deg;
  translate: 0 3%;
  z-index: 0;

  /* &::before {
    content: "";
    display: block;
    width: 100%;
    height: 100%;
    rotate: inherit;
    box-shadow: 0 0 0.1rem 0 red;
    background: rgb(0 0 0 / 0.65);
    border-radius: var(--card-radius);
    position: absolute;
    top: 0;
    left: 0;
    z-index: 5;
  } */
}

h1.complete {
  background: var(--gradient-gold);
  color: transparent;
  background-clip: text;
  position: relative;
}

h2 span {
  font-size: small;
  text-transform: lowercase;
}

.icon {
  scale: 1.8;
  color: gold;

  &:hover {
    color: firebrick;
    cursor: pointer;
  }
}
</style>
