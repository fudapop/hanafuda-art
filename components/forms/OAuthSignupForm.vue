<template>
  <div>
    <div class="grid items-center grid-cols-[1fr_1fr_1fr] w-full">
      <div aria-hidden="true">
        <div class="w-full border-t border-border" />
      </div>
      <div class="flex justify-center text-sm font-medium leading-6 w-max">
        <span class="px-6 text-text">{{ t('auth.links.orContinueWith') }}</span>
      </div>
      <div aria-hidden="true">
        <div class="w-full border-t border-border" />
      </div>
    </div>
    <div class="grid gap-4 pt-4 xs:grid-cols-2">
      <OAuthProviderButton
        :action="linkAccount"
        provider="google"
        :onSuccess="() => $emit('success')"
      />
      <OAuthProviderButton
        :action="linkAccount"
        provider="github"
        :onSuccess="() => $emit('success')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const { linkAccount } = useAuth()

defineEmits(['success', 'error'])
</script>
