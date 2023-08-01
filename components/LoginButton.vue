<template>
  <div>
    <Button v-if="!user" button-class="secondary" :action="login"> Login &rarr; </Button>
    <Button v-else button-class="secondary" :action="logout"> &larr; Logout </Button>
    <div
      v-if="error"
      class="absolute inset-0 mx-auto rounded-md px-8 py-4 text-lg border-red-500"
    >
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { logout, error, useGuest } = useAuth();
const user = useCurrentUser();

const login = () => {
  if (useGuest().value) {
    navigateTo("/");
  } else {
    navigateTo("/login");
  }
};

watch(user, () => {
  if (user.value) {
    navigateTo("/");
  } else {
    if (useRoute().meta.requiresAuth) navigateTo("/login");
  }
});
</script>

<style scoped></style>
