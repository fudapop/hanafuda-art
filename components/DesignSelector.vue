<template>
    <Menu as="div" class="relative inline-block text-left">
        <div>
            <MenuButton
                class="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                Options
                <ChevronDownIcon class="w-5 h-5 -mr-1 text-gray-400" aria-hidden="true" />
            </MenuButton>
        </div>

        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
            <MenuItems
                class="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div class="p-3">


                    <RadioGroup v-model="selectedDesign">
                        <RadioGroupLabel class="text-base font-semibold leading-6 text-gray-900">Select a design
                        </RadioGroupLabel>

                        <div class="grid grid-cols-1 mt-4 gap-y-3">
                            <RadioGroupOption as="template" v-for="designOption in designList" :key="designOption"
                                :value="designOption" v-slot="{ active, checked }">
                                <div
                                    :class="[active ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-300', 'relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none']">
                                    <span class="flex flex-1">
                                        <span class="flex flex-col">
                                            <RadioGroupLabel as="span" class="block text-sm font-medium text-gray-900">{{
                                                designOption }}</RadioGroupLabel>
                                            <!-- <RadioGroupDescription as="span"
                                                class="flex items-center mt-1 text-sm text-gray-500">{{
                                                    mailingList.description }}</RadioGroupDescription>
                                            <RadioGroupDescription as="span" class="mt-6 text-sm font-medium text-gray-900">
                                                {{ mailingList.users }}</RadioGroupDescription> -->
                                        </span>
                                    </span>
                                    <CheckCircleIcon :class="[!checked ? 'invisible' : '', 'h-5 w-5 text-indigo-600']"
                                        aria-hidden="true" />
                                    <span
                                        :class="[active ? 'border' : 'border-2', checked ? 'border-indigo-600' : 'border-transparent', 'pointer-events-none absolute -inset-px rounded-lg']"
                                        aria-hidden="true" />
                                </div>
                            </RadioGroupOption>
                        </div>
                    </RadioGroup>


                    <!-- <form method="POST" action="#">
                        <MenuItem v-slot="{ active }">
                        <button 
                        type="submit"
                            :class="[active ? 'bg-gray-100 text-gray-900' : 'text-gray-700', 'block w-full px-4 py-2 text-left text-sm']">
                            Signout
                            </button>
                        </MenuItem>
                    </form> -->
                </div>
            </MenuItems>
        </transition>
    </Menu>
</template>
  
<script setup lang="ts">
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue'
import { ChevronDownIcon } from '@heroicons/vue/20/solid'

import { RadioGroup, RadioGroupDescription, RadioGroupLabel, RadioGroupOption } from '@headlessui/vue'
import { CheckCircleIcon } from '@heroicons/vue/20/solid'

const { useDesign, fetchCardUrls, DESIGNS } = useCardDesign();
const selectedDesign = useDesign();

const designList: Array<typeof selectedDesign.value> = [...DESIGNS];

const preloadTags = ref();

onMounted(() => {
    useHead({
        link: [
            { rel: "preconnect", href: "https://firebasestorage.googleapis.com" },
        ]
    }, { tagPriority: "high" });
    const preloadHead = useHead({});
    watchEffect(() => {
        fetchCardUrls().then(urlMap => {
            preloadTags.value = [...urlMap.values()].map((url) => (
                { rel: "preload", href: url, as: "image" }
            ));
            preloadHead?.patch({
                bodyAttrs: { class: selectedDesign },
                link: preloadTags.value,
            });
        });
    })
})


</script>