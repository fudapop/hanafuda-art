<template>
  <HeadlessRadioGroup v-model="selectedDesign" as="div" class="relative w-full @container">
    <div class="sticky top-0 z-10 flex justify-between px-4 py-2 bg-white shadow-sm dark:bg-gray-800">
      <HeadlessRadioGroupLabel class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
        Select a design
        <p class="ml-2 text-sm font-medium text-gray-400 whitespace-nowrap">
          {{ `Current: ${getDesignInfo().title}` }}
        </p>
      </HeadlessRadioGroupLabel>
      <div
        class="flex items-center self-start font-semibold tracking-wide text-gray-900 gap-x-2 whitespace-nowrap dark:text-white"
      >
        <img src="/images/coin.webp" alt="coin" class="w-5 h-5 drop-shadow-sm" />
        {{ coins }}
      </div>
    </div>
    <div class="grid justify-center w-full px-3 mt-2 space-y-12">
      <HeadlessRadioGroupOption
        v-for="(design, index) in DESIGNS"
        :class="[
          design,
          'group grid w-full @md:grid-cols-[200px,1fr] place-items-center grid-rows-[200px,1fr] @md:grid-rows-1 relative',
        ]"
        v-slot="{ checked }"
        :value="design"
        :disabled="!unlocked?.includes(design)"
      >
        <Transition
          mode="out-in"
          enter-to-class="opacity-100"
          enter-from-class="opacity-0 -scale-x-[25%]"
          enter-active-class="duration-500"
          leave-to-class="opacity-0"
          leave-from-class="opacity-100"
          leave-active-class="duration-400"
        >
          <div
            v-if="!checked"
            :class="[
              'cursor-pointer relative card down isolate drop-shadow-md mx-auto',
              checked ? 'ring-1 ring-offset-2 ring-indigo-600 dark:ring-yellow-300' : '',
            ]"
          >
            <!-- NEW DESIGN TAG -->
            <span
              v-if="isNew(design)"
              class="absolute top-0 left-0 px-2 py-1 text-xs font-semibold tracking-wide text-white bg-indigo-600 rounded-tl-md rounded-br-md dark:bg-yellow-300 dark:text-gray-900"
            >
              New
            </span>
            <!-- UNLOCK BUTTON -->
            <button
              type="button"
              v-if="unlocked && !unlocked.includes(design)"
              @click="() => handleUnlock(design)"
              class="rounded-[inherit]"
            >
              <div
                class="absolute inset-0 h-full transition-opacity bg-white opacity-50 ring-1 ring-white dark:ring-gray-800 rounded-[inherit] -z-10 dark:bg-black group-hover:opacity-75"
              ></div>
              <LockClosedIcon
                class="absolute inset-x-0 w-8 h-auto mx-auto text-gray-900 top-1/3 dark:text-white group-hover:opacity-0"
              />
              <LockOpenIcon
                class="absolute inset-x-0 w-8 h-auto mx-auto text-gray-900 translate-x-1 opacity-0 top-1/3 dark:text-white group-hover:opacity-100"
              />
              <div
                class="absolute inset-x-0 mx-auto text-sm font-semibold tracking-wide text-gray-900 transition-all opacity-0 w-max bottom-4 dark:text-white group-hover:opacity-100 group-hover:-translate-y-2"
              >
                <img src="/images/coin.webp" alt="coin" class="inline w-4 h-4 align-middle drop-shadow-sm" />
                {{ UNLOCK_COST }}
              </div>
            </button>
          </div>
          <AnimatedCards v-else />
        </Transition>

        <!-- DESCRIPTION SECTION -->
        <div
          :class="[
            'relative w-full @md:w-[360px] space-y-4 px-4 pb-4 rounded-lg dark:text-white',
            checked ? 'dark:bg-[#40495a] bg-gray-50 shadow-inner shadow-gray-400 dark:shadow-gray-900' : '',
          ]"
        >
          <button
            type="button"
            @click="() => handleLike(design)"
            class="relative float-right mt-4 pointer-events-auto focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:dark:ring-yellow-300"
          >
            <span class="absolute pt-1 m-auto text-sm text-gray-900 opacity-50 -left-3 dark:text-white">{{
              likesCount.get(design)
            }}</span>
            <HeartIcon
              :aria-hidden="true"
              :class="[
                'w-7 h-auto stroke-gray-500 stroke-1 drop-shadow-md',
                isLiked(design) ? 'fill-red-600 stroke-red-400' : '',
              ]"
            />
          </button>

          <DesignDescription :design="design" />
        </div>
        <div v-if="index < DESIGNS.length - 1" class="absolute bottom-0 left-0 right-0">
          <div class="relative">
            <div class="absolute inset-0 flex items-center" aria-hidden="true">
              <div class="w-[90%] mx-auto mt-12 border-b border-gray-300 opacity-30" />
            </div>
          </div>
        </div>
      </HeadlessRadioGroupOption>
    </div>

    <Modal :open="!!newUnlock">
      <template #image>
        <div :class="[newUnlock, 'flex items-center text-gray-900 dark:text-white justify-center']">
          <img src="/images/coin.webp" alt="coin" class="inline w-8 h-8 drop-shadow-sm" />
          <ArrowRightIcon class="inline w-5 h-5 mx-2" />
          <LockOpenIcon class="w-8 h-auto" />
        </div>
      </template>

      <template #description>
        <span class="text-base text-gray-900 dark:text-white"> Spend {{ UNLOCK_COST }} coins to use this design? </span>
      </template>

      <template #actions>
        <div class="grid grid-flow-row-dense grid-cols-2 gap-3 mt-6">
          <button type="button" class="sec-btn" @click="cancelUnlock">No, keep my coins.</button>
          <button type="button" class="pri-btn" @click="confirmUnlock">Yes, unlock it!</button>
        </div>
      </template>
    </Modal>
  </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { LockClosedIcon, LockOpenIcon, ArrowRightIcon } from "@heroicons/vue/20/solid";
import { HeartIcon } from "@heroicons/vue/24/outline";
import { getFirestore, collection, getCountFromServer, query, where } from "firebase/firestore";
import { useToast } from "vue-toastification";
import DesignDescription from "./DesignDescription.vue";

type CardDesign = (typeof DESIGNS)[number];

const { DESIGNS, useDesign, getDesignInfo } = useCardDesign();
const selectedDesign = useDesign();
const toast = useToast();

const isNew = (design: CardDesign) => {
  const { releaseDate } = getDesignInfo(design);
  if (!releaseDate) return false;
  const isRecent = new Date().getTime() - new Date(releaseDate).getTime() < 1000 * 60 * 60 * 24 * 14;
  return isRecent;
};

const UNLOCK_COST = 500;
const currentUser = useProfile().current;
const coins = computed({
  get: () => currentUser?.value?.record.coins ?? 0,
  set: (value) => {
    if (!currentUser) return;
    if (!currentUser.value) return;
    currentUser.value.record.coins = Number(value);
  },
});

const unlocked = computed(() => currentUser?.value?.designs.unlocked);
const newUnlock: Ref<CardDesign | undefined> = ref();
let initialDesign: CardDesign | undefined;
let timeoutId: string | number | NodeJS.Timeout | undefined;
let toastId: any;

const handleUnlock = (design: CardDesign) => {
  if (!initialDesign) initialDesign = selectedDesign.value;
  selectedDesign.value = design;
  if (coins.value === undefined || !unlocked.value) return;
  if (coins.value < UNLOCK_COST) {
    toast.dismiss(toastId);
    toastId = toast.info("You don't have enough coins yet...", { timeout: 9000 });
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      selectedDesign.value = initialDesign!;
      initialDesign = undefined;
    }, 10000);
    return;
  }
  newUnlock.value = design;
};

const cancelUnlock = () => {
  newUnlock.value = undefined;
  selectedDesign.value = initialDesign!;
};

const confirmUnlock = () => {
  if (coins.value === undefined || !unlocked.value) return;
  if (!newUnlock.value) return;
  coins.value -= UNLOCK_COST;
  unlocked.value.push(newUnlock.value);
  toast.success("You've unlocked a new design!", { timeout: 5000 });
  selectedDesign.value = newUnlock.value;
  newUnlock.value = undefined;
};

const userIsGuest = toValue(useAuth().userIsGuest);
const userLiked = toValue(computed(() => currentUser?.value?.designs.liked));

const currentDesign = useDesign();
const coll = collection(getFirestore(), "users");
const likesCount = reactive<Map<CardDesign, number>>(new Map());
const getLikesCount = async (design: CardDesign) => {
  if (likesCount.has(design)) return likesCount.get(design);
  const q = query(coll, where("designs.liked", "array-contains", design));
  const count = (await getCountFromServer(q)).data().count;
  likesCount.set(design, count);
  return count;
};

const isLiked = (design: CardDesign) => userLiked?.includes(design);
const handleLike = (design: CardDesign) => {
  if (!userLiked) return;
  if (isLiked(design)) {
    userLiked.splice(userLiked.indexOf(design), 1);
    likesCount.set(design, likesCount.get(design)! - 1);
  } else {
    userLiked.push(design);
    likesCount.set(design, likesCount.get(design)! + 1);
  }
};

onMounted(() => {
  if (userIsGuest) {
    currentDesign.value = "cherry-version";
  } else {
    currentDesign.value = unlocked.value?.find((d) => userLiked?.includes(d)) || "cherry-version";
  }
  DESIGNS.forEach(async (design) => {
    likesCount.set(design, (await getLikesCount(design)) ?? 0);
  });
});
</script>
