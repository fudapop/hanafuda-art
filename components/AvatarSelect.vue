<template>
  <HeadlessPopover class="">
    <HeadlessPopoverButton>
      <slot />
    </HeadlessPopoverButton>

    <HeadlessPopoverPanel
      v-slot="{ close }"
      class="fixed z-10 bg-gray-900 shadow-xl rounded-xl inset-[20%] m-auto space-y-6"
    >
      <h3
        class="text-gray-900 dark:text-white text-xl text-center font-semibold tracking-wide mt-4"
      >
        Choose Your Avatar
      </h3>
      <div class="flex gap-4 flex-wrap flex-shrink-0 justify-center pb-12 px-8">
        <img
          v-for="url in avatars"
          :key="url"
          :src="url"
          alt="user avatar"
          :class="`w-16 h-auto sm:w-24 rounded-full shadow-lg cursor-pointer ${
            url === modelValue ? 'ring-2 ring-indigo-600 dark:ring-yellow-300' : ''
          }`"
          @click="() => handleClick(url, close)"
        />
      </div>
    </HeadlessPopoverPanel>
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
