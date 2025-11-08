<template>
  <Modal :open="open">
    <template #title
      ><span class="text-lg text-balance"> {{ t('signup.prompt.title') }} </span></template
    >
    <template #image>
      <img
        src="https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/coin.webp"
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
        <div class="mt-8 space-y-8">
          <p class="text-center text-text">
            {{ t('signup.prompt.description') }}
          </p>
          <p class="text-center text-text">
            {{ t('signup.prompt.question') }}
          </p>
          <div class="grid grid-flow-row-dense gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="sec-btn"
              @click="$emit('cancel')"
            >
              {{ t('signup.actions.noThanksDeleteMe') }}
            </button>
            <button
              type="button"
              class="pri-btn"
              @click="gotoSignIn"
            >
              {{ t('signup.actions.yesGimmeCoins') }}
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </Modal>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { open } = defineProps<{ open: boolean }>()
defineEmits(['cancel'])

const localeRoute = useLocaleRoute()

const gotoSignIn = () => {
  const route = localeRoute({ name: 'sign-in', query: { signup: 'true' } })
  if (route) {
    navigateTo(route.fullPath)
  }
}
</script>
