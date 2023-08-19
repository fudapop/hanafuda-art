<template>
    <HeadlessRadioGroup v-model="selectedDesign" >
        <div class="grid items-center grid-cols-2 px-8">
            <HeadlessRadioGroupLabel class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
                Select a design
            </HeadlessRadioGroupLabel>
            <div class="font-semibold tracking-wide text-right text-gray-900 dark:text-white">
                <img src="/images/coin.webp" alt="coin" class="inline w-5 h-5 align-middle" />
                {{ coins }}
            </div>
        </div>
        <div class="flex flex-wrap justify-center w-full gap-3 px-3 mt-2">
            <HeadlessRadioGroupOption v-for="design in DESIGNS" :class="[design, 'cursor-pointer group']"
                v-slot="{ checked }" :value="design" :disabled="!unlocked?.includes(design)">
                <div :class="[
                    'relative card down isolate',
                    (design as CardDesign) === selectedDesign ? 'ring-1 ring-offset-2 ring-indigo-600 dark:ring-yellow-300' : '',
                ]">
                    <button type="button" v-if="unlocked && !unlocked.includes(design)" @click="() => handleUnlock(design)" class="rounded-[inherit]">
                        <div class="absolute inset-0 h-full transition-opacity bg-white opacity-50 ring-1 ring-white dark:ring-gray-800 rounded-[inherit] -z-10 dark:bg-black group-hover:opacity-75">
                        </div>
                        <LockClosedIcon
                            class="absolute inset-0 w-8 h-auto m-auto text-gray-900 dark:text-white group-hover:opacity-0" />
                        <LockOpenIcon
                            class="absolute inset-0 w-8 h-auto m-auto text-gray-900 translate-x-1 opacity-0 dark:text-white group-hover:opacity-100" />
                        <div
                            class="absolute inset-x-0 mx-auto text-sm font-semibold tracking-wide text-gray-900 transition-all opacity-0 w-max top-4 dark:text-white group-hover:opacity-100 group-hover:-translate-y-2">
                            <img src="/images/coin.webp" alt="coin" class="inline w-4 h-4 align-middle" />
                            {{ UNLOCK_COST }}
                        </div>
                    </button>
                </div>
            </HeadlessRadioGroupOption>
        </div>
    </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { LockClosedIcon, LockOpenIcon } from '@heroicons/vue/20/solid';

type CardDesign = typeof DESIGNS[number]

const { DESIGNS, useDesign } = useCardDesign();
const selectedDesign = useDesign();

const UNLOCK_COST = 500;
const currentUser = toValue(useProfile().current)
const coins = computed({
    get: () => currentUser?.record.coins,
    set: (value) => {
        if (!currentUser || !value) return;
        currentUser.record.coins = value;
    }
})

const unlocked = computed(() => currentUser?.designs.unlocked);

const handleUnlock = (design: CardDesign) => {
    if (coins.value === undefined || !unlocked.value) return;
    if (coins.value < UNLOCK_COST) {
        // TODO: add toast
        console.warn("Not enough coins.");
        return;
    }
    coins.value -= UNLOCK_COST;
    unlocked.value.push(design);
    // TODO: add toast
    console.log("Unlocked", design)
}
</script>

<style scoped></style>