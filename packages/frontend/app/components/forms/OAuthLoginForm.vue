<template>
  <div class="grid gap-4">
    <OAuthProviderButton
      :action="loginWithOAuth"
      provider="google"
      :onSuccess="() => $emit('success')"
    />
    <OAuthProviderButton
      :action="loginWithOAuth"
      provider="github"
      :onSuccess="() => $emit('success')"
    />
  </div>
</template>

<script setup lang="ts">
const { loginWithOAuth } = useAuth()

defineEmits(['success', 'error'])
</script>
