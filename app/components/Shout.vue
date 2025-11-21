<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black/50 z-999">
    <div class="relative w-full h-full">
      <!-- AVATAR pan up and fade in -->
      <div class="center">
        <img
          v-if="avatar"
          :src="avatar"
          alt="Avatar"
          class="rounded-full size-24 md:size-48 drop-shadow-lg duration-1000 motion-safe:animate-fade-in-up"
        />
      </div>
      <div class="center h-max w-max motion-safe:animate-stamp max-w-screen">
        <img
          src="/images/coin.webp"
          alt="Koi-Koi has been called."
          class="size-12 md:size-24 mt-2 md:mt-3 drop-shadow-lg"
        />
        <h1
          class="text-5xl md:text-8xl text-white center tracking-[0.5em] whitespace-nowrap drop-shadow-lg"
        >
          {{ msg.toUpperCase() }}
        </h1>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  calledBy: 'p1' | 'p2'
  msg: string
}>()

const { p1Avatar, p2Avatar } = useAvatar()

const avatar = props.calledBy === 'p1' ? p1Avatar.value : p2Avatar.value
</script>

<style scoped>
h1 {
  font-family: 'Potta One';
}

.center {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;

  h1 {
    translate: -47% -50%;
  }
}
</style>
