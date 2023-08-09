<template>
  <div
    class="fixed h-screen w-screen after:content-normal after:block after:fixed after:h-full after:bg-indigo-300/30 dark:after:bg-black/20 after:inset-0"
  >
    <NuxtImg
      src="/bg/grey-hills-1280.webp"
      srcset="/bg/grey-hills-768.webp 768w, /bg/grey-hills-1024.webp 1024w, /bg/grey-hills-1280.webp 1280w, /bg/grey-hills-1920.webp 1920w"
      alt="Moon over grassy fields"
      sizes="100vw"
      :class="{
        'object-cover h-full w-full -z-20 -scale-x-100 transition-all duration-1000': true,
        'object-center': koikoiIsCalled,
        'object-right': !koikoiIsCalled,
      }"
    />
  </div>
</template>

<script setup lang="ts">
const { koikoiIsCalled } = useDecisionHandler();
</script>

<style scoped></style>
