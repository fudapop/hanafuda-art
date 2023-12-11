<template>
    <HeadlessRadioGroup v-model="selectedDesign" >
        <div class="grid items-center grid-cols-2 px-8">
            <HeadlessRadioGroupLabel class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
                Select a design
            </HeadlessRadioGroupLabel>
            <div class="font-semibold tracking-wide text-right text-gray-900 dark:text-white">
                <img src="/images/coin.webp" alt="coin" class="inline w-5 h-5 align-middle drop-shadow-sm" />
                {{ coins }}
            </div>
        </div>
        <div class="flex flex-wrap justify-center w-full gap-3 px-3 mt-2">
            <HeadlessRadioGroupOption v-for="design in DESIGNS" :class="[design, 'cursor-pointer group']"
                v-slot="{ checked }" :value="design" :disabled="!unlocked?.includes(design)">
                <div :class="[
                    'relative card down isolate drop-shadow-md',
                    (design as CardDesign) === selectedDesign ? 'ring-1 ring-offset-2 ring-indigo-600 dark:ring-yellow-300' : '',
                ]">
                    <button type="button" v-if="unlocked && !unlocked.includes(design)" @click="() => handleUnlock(design)" class="rounded-[inherit]">
                        <div class="absolute inset-0 h-full transition-opacity bg-white opacity-50 ring-1 ring-white dark:ring-gray-800 rounded-[inherit] -z-10 dark:bg-black group-hover:opacity-75">
                        </div>
                        <LockClosedIcon
                            class="absolute inset-x-0 w-8 h-auto mx-auto text-gray-900 top-1/3 dark:text-white group-hover:opacity-0" />
                        <LockOpenIcon
                            class="absolute inset-x-0 w-8 h-auto mx-auto text-gray-900 translate-x-1 opacity-0 top-1/3 dark:text-white group-hover:opacity-100" />
                        <div
                            class="absolute inset-x-0 mx-auto text-sm font-semibold tracking-wide text-gray-900 transition-all opacity-0 w-max top-4 dark:text-white group-hover:opacity-100 group-hover:-translate-y-2">
                            <img src="/images/coin.webp" alt="coin" class="inline w-4 h-4 align-middle drop-shadow-sm" />
                            {{ UNLOCK_COST }}
                        </div>
                    </button>
                </div>
            </HeadlessRadioGroupOption>
        </div>
        <Modal :open="!!newUnlock">
            <!-- <template #title> Unlock a new design </template> -->
    <template #image>
    <div :class="[newUnlock, 'flex items-center text-gray-900 dark:text-white justify-center']">
        <img src="/images/coin.webp" alt="coin" class="inline w-8 h-8 drop-shadow-sm" />
        <ArrowRightIcon class="inline w-5 h-5 mx-2" />
        <LockOpenIcon class="w-8 h-auto" />

    </div>
    </template>
    <template #description>
    <span class="text-base">
      Spend {{ UNLOCK_COST }} coins to use this design?
    </span>
    </template>
    <template #actions>
      <div class="grid grid-flow-row-dense grid-cols-2 gap-3 mt-6">
        <button type="button" class="sec-btn" @click="cancelUnlock">
          No, keep my coins.
        </button>
        <button type="button" class="pri-btn" @click="confirmUnlock">
          Yes, unlock it!
        </button>
      </div>
    </template>
        </Modal>
    </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { LockClosedIcon, LockOpenIcon, ArrowRightIcon } from '@heroicons/vue/20/solid';
import { useToast } from 'vue-toastification';

type CardDesign = typeof DESIGNS[number]

const { DESIGNS, useDesign } = useCardDesign();
const selectedDesign = useDesign();
const toast = useToast();

const UNLOCK_COST = 500;
const currentUser = toValue(useProfile().current)
const coins = computed({
    get: () => currentUser?.record.coins,
    set: (value) => {
        if (!currentUser || !value) return;
        currentUser.record.coins = value;
    }
})

const emits = defineEmits(["preview"]);
const unlocked = computed(() => currentUser?.designs.unlocked);
const newUnlock: Ref<CardDesign | undefined> = ref();

const handleUnlock = (design: CardDesign) => {
    const initialValue = selectedDesign.value;
    selectedDesign.value = design;
    if (coins.value === undefined || !unlocked.value) return;
    if (coins.value < UNLOCK_COST) {
        toast.info("You don't have enough coins yet... 🤗", { timeout: 9000 });
        setTimeout(() => selectedDesign.value = initialValue, 10000);
        return;
    }
    newUnlock.value = design;
}

const cancelUnlock = () => {
    newUnlock.value = undefined;
    emits("preview", undefined);
}

const confirmUnlock = () => {
    if (coins.value === undefined || !unlocked.value) return;
    if (!newUnlock.value) return;

    coins.value -= UNLOCK_COST;
    unlocked.value.push(newUnlock.value);
    toast.success("You've unlocked a new design! 🎉", { timeout: 5000 });
    selectedDesign.value = newUnlock.value;
    newUnlock.value = undefined;
}
</script>

<style scoped></style>