<template>
  <Modal :open="open">
    <template #title
      ><span class="[text-wrap:balance] text-xl">
        {{ t('auth.passwordReset.title') }}
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
        <div class="h-[250px] xs:h-40 my-8">
          <p class="my-5 text-base text-center text-text-secondary text-balance">
            {{ t('auth.passwordReset.description') }}
          </p>
          <form @submit.prevent="handlePressSend">
            <input
              type="email"
              class="w-full px-3 py-2 text-sm border rounded-md border-border bg-surface text-text"
              required
              placeholder="Email"
              v-model="email"
            />
            <div class="grid grid-flow-row-dense gap-3 py-4 sm:grid-cols-2">
              <button
                type="button"
                class="w-full action-button"
                @click="$emit('cancel')"
              >
                {{ t('common.actions.cancel') }}
              </button>
              <button
                type="submit"
                class="w-full action-button bg-border"
                :disabled="!email"
              >
                {{ t('common.actions.send') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { useStorage } from '@vueuse/core'

const { open } = defineProps<{ open: boolean }>()
const emit = defineEmits(['cancel'])
const { t } = useI18n()

const { resetPassword } = useAuth()
const rememberedEmail = useStorage('hanafuda-email', '', localStorage, { mergeDefaults: true })
const email = ref(rememberedEmail.value)

const handlePressSend = async () => {
  await resetPassword(email.value)
  email.value = ''
  emit('cancel')
}
</script>
