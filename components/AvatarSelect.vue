<template>
  <HeadlessPopover class="">
    <HeadlessPopoverButton>
      <slot />
    </HeadlessPopoverButton>
    <!-- <HeadlessPopoverOverlay class="fixed inset-0 z-40 bg-black opacity-70" /> -->
    
    <Transition
    appear
    enter-active-class="duration-200 ease-out"
    enter-from-class="translate-y-4 opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="translate-y-4 opacity-0"
    >
    <HeadlessPopoverPanel
      v-slot="{ close }"
      class="fixed z-50 max-xs:inset-x-0 px-3 py-4 m-4 max-w-[500px] [@media(min-height:_500px)]:xs:bottom-4 [@media(min-height:_500px)]:xs:-translate-x-1/3  [@media(max-height:_500px)]:max-w-[40%] [@media(max-height:_500px)]:right-0 border border-gray-300/50 dark:border-gray-700/50 rounded-xl [@media(max-height:_500px)]:inset-y-4 my-auto space-y-5 shadow-xl bg-white dark:bg-gray-800"
    >
      <h3
        class="mt-4 text-xl font-semibold tracking-wide text-center text-gray-900 dark:text-white"
      >
        Choose Your Avatar
      </h3>
      <div class="flex flex-wrap justify-center gap-4">
        <img
          v-for="url in avatars"
          :key="url"
          :src="url"
          alt="user avatar"
          :class="`w-16 h-auto [@media(min-height:500px)]:sm:w-24 rounded-full shadow-lg cursor-pointer ${
            url === modelValue ? 'ring-2 ring-indigo-600 dark:ring-yellow-300' : ''
          }`"
          @click="() => handleClick(url, close)"
        />
      </div>
    </HeadlessPopoverPanel>
    </Transition>
  </HeadlessPopover>
</template>

<script setup lang="ts">
const { modelValue } = defineProps<{ modelValue: string }>();
const emits = defineEmits(["update:modelValue"]);

const photo = computed(() => useCurrentUser().value?.photoURL);
const avatars = ref([
  "/avatars/origami-crane.webp",
  "/avatars/origami-warbler.webp",
  "/avatars/origami-curtain.webp",
  "/avatars/origami-butterfly.webp",
  "/avatars/origami-boar.webp",
  "/avatars/origami-moon.webp",
  "/avatars/origami-deer.webp",
  "/avatars/origami-rainman.webp",
  "/avatars/origami-phoenix.webp",
]);

if (photo.value) {
  avatars.value.unshift(photo.value);
}

const handleClick = (url: string, close: () => void) => {
  emits("update:modelValue", url);
  close();
};
</script>
