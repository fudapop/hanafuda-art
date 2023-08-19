<template>
    <HeadlessRadioGroup v-model="selectedDesign" class="h-full">
        <HeadlessRadioGroupLabel class="ml-4 text-lg font-semibold tracking-wide text-gray-900 dark:text-white">
        Select a design:
        </HeadlessRadioGroupLabel>
        <div class="flex flex-wrap justify-center w-full gap-3 px-3 mt-2">
        <HeadlessRadioGroupOption v-for="design in DESIGNS" :class="[design, 'cursor-pointer disabled:pointer-events-none']" v-slot="{ checked }" :value="design" :disabled="!unlocked?.includes(design)">
            <!-- <span :class="checked ? 'bg-blue-200' : ''">Startup</span> -->
            <div :class="[
                'relative card down isolate',
                (design as CardDesign) === selectedDesign ? 'ring ring-offset-2 ring-indigo-600 dark:ring-yellow-300' : '',
            ]">
                <template v-if="unlocked && !unlocked.includes(design)">
                    <div class="absolute inset-0 h-full -z-10 bg-white/50 dark:bg-black/50">
                    </div>
                    <LockClosedIcon class="absolute inset-0 w-8 h-auto m-auto text-gray-900 dark:text-white" />
                </template>
            </div>
        </HeadlessRadioGroupOption>
        </div>
    </HeadlessRadioGroup>
</template>

<script setup lang="ts">
import { LockClosedIcon } from '@heroicons/vue/20/solid';

type CardDesign = typeof DESIGNS[number]

const { DESIGNS, useDesign } = useCardDesign();

const selectedDesign = useDesign();

const unlocked = computed(() => useProfile().current.value?.designs.unlocked);
</script>

<style scoped></style>