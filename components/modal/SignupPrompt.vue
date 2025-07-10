<template>
  <Modal :open="open">
    <template #title
      ><span class="[text-wrap:balance]"> You've got coins! How about 500 more? </span></template
    >
    <template #image>
      <img
        src="~/assets/images/coin.webp"
        alt="coin"
        class="w-8 h-8 mx-auto drop-shadow-sm"
      />
    </template>
    <template #actions>
      <Transition
        mode="out-in"
        enter-active-class="duration-200 ease-out"
        enter-from-class="translate-x-4 opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-out"
        leave-from-class="opacity-100"
        leave-to-class="translate-x-4 opacity-0"
      >
        <div class="h-[250px] xs:h-40 mt-5">
          <p class="text-sm text-center text-gray-600 dark:text-gray-300">
            Your coins can be used to unlock new card designs and avatars. However, guest profiles
            cannot be saved.
          </p>
          <p class="mt-5 text-sm text-center text-gray-600 dark:text-gray-300">
            Sign in to save your profile and receive an extra 500 coins?
          </p>
          <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
            <button
              type="button"
              class="sec-btn"
              @click="$emit('cancel')"
            >
              No thanks, delete me
            </button>
            <button
              type="button"
              class="pri-btn"
              @click="gotoSignIn"
            >
              Yes, gimme coins!
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </Modal>
</template>

<script setup lang="ts">
const { open } = defineProps<{ open: boolean }>()
defineEmits(['cancel'])
const gotoSignIn = () =>
  navigateTo({
    path: '/sign-in',
    query: { signup: 'true' },
  })
</script>
