<template>
  <HeadlessPopover>
    <HeadlessPopoverButton>
      <slot />
    </HeadlessPopoverButton>

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
        class="fixed z-50 overflow-hidden inset-x-3 mx-auto max-w-[640px] rounded-lg [@media(max-height:_500px)]:inset-y-3 top-12 shadow-lg bg-background ring-1 ring-border ring-opacity-5 focus:outline-hidden"
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b shadow-xs bg-border border-border"
        >
          <h3 class="text-lg font-semibold tracking-wide text-text w-max">
            {{ t('menu.avatarSelect.title') }}
          </h3>
          <button @click="close">
            <Icon
              name="mdi:close"
              class="w-4 h-4 text-text"
            />
            <span class="sr-only">{{ t('common.actions.close') }}</span>
          </button>
        </div>
        <div class="max-h-[500px] overflow-y-auto">
          <div class="grid justify-center grid-cols-4 gap-4 px-4 py-8 place-items-center">
            <img
              v-for="url in avatars"
              :key="url"
              :src="url"
              alt="user avatar"
              :class="`w-16 h-auto [@media(min-height:500px)]:sm:w-24 rounded-full drop-shadow-xs cursor-pointer ${
                url === modelValue ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`"
              @click="() => handleClick(url, close)"
            />
          </div>
        </div>
      </HeadlessPopoverPanel>
    </Transition>
  </HeadlessPopover>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { modelValue } = defineProps<{ modelValue: string }>()
const emits = defineEmits(['update:modelValue'])

const { listAvatars } = useAvatar()

// Demo mode: only show basic avatars (no premium/locked avatars, no auth photo)
const basicAvatars = [...listAvatars('origami'), ...listAvatars('flat')]
const avatars = computed(() => basicAvatars.map((a) => a.url))

const handleClick = (url: string, close: () => void) => {
  emits('update:modelValue', url)
  close()
}
</script>
