<template>
  <div>
    <button type="button" v-if="!user" class="sec-btn" @click="login">
      Login &rarr;
    </button>
    <button type="button" v-else class="sec-btn" @click="logoutUser">
      &larr; Logout
    </button>
    <div
      v-if="error"
      class="absolute inset-0 px-8 py-4 mx-auto text-lg border-red-500 rounded-md"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { logout, error } = useAuth();
const user = useCurrentUser();

const login = () => {
  navigateTo("/login");
};

const logoutUser = () => {
  logout();
};

watch(user, () => {
  if (!user.value && useRoute().meta.requiresAuth) {
    navigateTo("/login?exit=true");
  }
});
</script>

<style scoped></style>
