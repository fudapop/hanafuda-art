<template>
  <div>
    <Button v-if="!user" button-class="secondary" :action="login"> Login &rarr; </Button>
    <Button v-else button-class="secondary" :action="logout"> &larr; Logout </Button>
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

watch(user, () => {
  if (!user.value && useRoute().meta.requiresAuth) {
    navigateTo("/login");
  }
});
</script>

<style scoped></style>
