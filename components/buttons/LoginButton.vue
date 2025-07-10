<template>
  <div>
    <button
      v-if="!user"
      class="action-button"
      @click="login"
    >
      SIGN IN
    </button>
    <button
      v-else
      class="action-button"
      @click="logoutUser"
    >
      SIGN OUT
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

const login = () => {
  navigateTo('/sign-in')
}

const logoutUser = () => {
  logout()
}

watch(user, () => {
  if (!user.value && useRoute().meta.requiresAuth) {
    navigateTo('/sign-in?exit=true')
  }
})
</script>

<style scoped></style>
