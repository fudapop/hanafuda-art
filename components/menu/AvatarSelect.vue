<template>
  <HeadlessPopover>
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
        class="fixed z-50 inset-x-3 mx-auto max-w-[640px] rounded-lg [@media(max-height:_500px)]:inset-y-3 my-auto shadow-lg bg-surface ring-1 ring-border ring-opacity-5 focus:outline-none"
      >
        <div
          class="flex items-center justify-center px-3 py-3 shadow-inner bg-primary/20 dark:bg-primary/30 rounded-[inherit]"
        >
          <h3 class="text-lg font-semibold tracking-wide text-text">Choose Your Avatar</h3>
        </div>
        <div class="flex flex-wrap justify-center gap-4 px-3 py-5">
          <img
            v-for="url in avatars"
            :key="url"
            :src="url"
            alt="user avatar"
            :class="`w-16 h-auto [@media(min-height:500px)]:sm:w-24 rounded-full drop-shadow-sm cursor-pointer ${
              url === modelValue ? 'ring-2 ring-offset-2 ring-primary' : ''
            }`"
            @click="() => handleClick(url, close)"
          />
        </div>
      </HeadlessPopoverPanel>
    </Transition>
  </HeadlessPopover>
</template>

<script setup lang="ts">
const { modelValue } = defineProps<{ modelValue: string }>()
const emits = defineEmits(['update:modelValue'])

const photo = computed(() => useCurrentUser().value?.photoURL)
const avatars = ref([
  '/avatars/flat-crane.webp',
  '/avatars/flat-warbler.webp',
  '/avatars/flat-curtain.webp',
  '/avatars/flat-bridge.webp',
  '/avatars/flat-butterflies.webp',
  '/avatars/flat-boar.webp',
  '/avatars/flat-moon.webp',
  '/avatars/flat-deer.webp',
  '/avatars/flat-phoenix.webp',
  '/avatars/origami-crane.webp',
  '/avatars/origami-warbler.webp',
  '/avatars/origami-curtain.webp',
  '/avatars/origami-cuckoo.webp',
  '/avatars/origami-bridge.webp',
  '/avatars/origami-butterflies.webp',
  '/avatars/origami-boar.webp',
  '/avatars/origami-moon.webp',
  '/avatars/origami-deer.webp',
  '/avatars/origami-rainman.webp',
  '/avatars/origami-phoenix.webp',
])

if (photo.value) {
  avatars.value.unshift(photo.value)
}

const handleClick = (url: string, close: () => void) => {
  emits('update:modelValue', url)
  close()
}
</script>
