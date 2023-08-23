<template>
  <Modal :open="open">
    <template #title
      ><span class="[text-wrap:balance]">
        You've got coins! How about 500 more?
      </span></template
    >
    <template #image>
      <img src="/images/coin.webp" alt="coin" class="w-8 h-8 drop-shadow-sm mx-auto" />
    </template>
    <!-- <template v-if="!openSignup" #description> </template> -->
    <template #actions>
      <Transition
        mode="out-in"
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-out"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div class="h-[250px] xs:h-40 mt-5" v-if="!openSignup">
          <p class="text-center text-sm text-gray-600 dark:text-gray-300">
            Your coins can be used to unlock new card designs and avatars. However, guest
            profiles cannot be saved.
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-5 text-center">
            Sign in to save your profile and receive an extra 500 coins?
          </p>
          <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
            <button type="button" class="sec-btn" @click="$emit('cancel')">
              No thanks, delete me
            </button>
            <button type="button" class="pri-btn" @click="() => (openSignup = true)">
              Yes, gimme coins!
            </button>
          </div>
        </div>
        <div class="h-[250px] xs:h-40 mt-5 relative" v-else>
          <SignupPanel class="" />
          <button
            type="button"
            class="absolute bottom-0 text-center inset-x-0 mx-auto text-xs underline"
            @click="() => (openSignup = false)"
          >
            Cancel
          </button>
        </div>
      </Transition>
    </template>
  </Modal>
</template>

<script setup lang="ts">
const { open } = defineProps<{ open: boolean }>();
const openSignup = ref(false);
defineEmits(["cancel"]);
</script>
