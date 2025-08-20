<template>
  <div>
    <button
      v-if="!user"
      class="action-button"
      @click="login"
    >
      {{ t('common.actions.signIn') }}
    </button>
    <button
      v-else
      class="action-button"
      @click="logoutUser"
    >
      {{ t('common.actions.signOut') }}
    </button>
    <div
      v-if="error"
      class="absolute inset-0 px-8 py-4 mx-auto text-lg border-red-500 rounded-sm"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { logout, error } = useAuth()
const user = useCurrentUser()
const { t } = useI18n()
const localeRoute = useLocaleRoute()

const login = () => {
  const route = localeRoute({ name: 'sign-in', query: { signup: 'true' } })
  if (route) {
    navigateTo(route.fullPath)
  }
}

const logoutUser = () => {
  logout()
}

watch(user, () => {
  if (!user.value && useRoute().meta.requiresAuth) {
    const route = localeRoute({ name: 'sign-in', query: { exit: 'true' } })
    if (route) {
      navigateTo(route.fullPath)
    }
  }
})
</script>

<style scoped></style>
