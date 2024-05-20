<template>
  <Modal :open="open">
    <template #title
      ><span class="[text-wrap:balance] text-xl">
        Reset your password?
      </span></template
    >
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
          <p class="my-5 text-base text-center text-gray-600 dark:text-gray-300 text-balance">
            A link to change your password will be sent if an associated account exists.
          </p>
          <form @submit.prevent="handlePressSend">
            <input type="email" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md" required placeholder="Email" v-model="email"/>
            <div class="grid grid-flow-row-dense gap-3 mt-6 sm:grid-cols-2">
              <button type="button" class="sec-btn" @click="$emit('cancel')">
                Cancel
              </button>
              <button type="submit" class="pri-btn">
                Send
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
const { open } = defineProps<{ open: boolean }>();
const emit = defineEmits(["cancel"]);

const { resetPassword } = useAuth();
const rememberedEmail = useStorage("hanafuda-email", "", localStorage, { mergeDefaults: true });
const email = ref(rememberedEmail.value);

const handlePressSend = async () => {
  await resetPassword(email.value);
  email.value = "";
  emit("cancel");
};
</script>
