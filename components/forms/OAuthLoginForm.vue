<template>
  <div>
    <div class="grid items-center grid-cols-[1fr_1fr_1fr] w-full">
      <div aria-hidden="true">
        <div class="w-full border-t border-gray-800 dark:border-gray-400/20" />
      </div>
      <div class="flex justify-center text-sm font-medium leading-6 w-max">
        <span class="px-6 text-gray-900 dark:text-gray-300">or continue with</span>
      </div>
      <div aria-hidden="true">
        <div class="w-full border-t border-gray-800 dark:border-gray-400/20" />
      </div>
    </div>
    <div class="grid gap-4 pt-4 xs:grid-cols-2">
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
  </div>
</template>

<script setup lang="ts">
const { loginWithOAuth } = useAuth()

defineEmits(['success', 'error'])
</script>
