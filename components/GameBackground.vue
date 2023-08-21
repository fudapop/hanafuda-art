<template>
  <div
    class="fixed w-screen h-screen after:content-normal after:block after:fixed after:h-full after:dark:bg-indigo-300/10 after:bg-indigo-300/30 after:inset-0"
  >
    <NuxtImg
      :src="bgImages[bgIndex].src"
      :srcset="bgImages[bgIndex].srcset"
      :alt="bgImages[bgIndex].alt"
      sizes="100vw"
      :class="{
        'object-cover h-full w-full -z-20 -scale-x-100 transition-all duration-1000': true,
        'motion-safe:object-right': !noCalls,
        'object-center': noCalls,
      }"
    />
  </div>
</template>

<script setup lang="ts">
const { noCalls } = useDecisionHandler();
const bgIndex = 1;
const bgImages = [
  {
    src: "/bg/grey-hills-1280.webp",
    srcset: "/bg/grey-hills-768.webp 768w, /bg/grey-hills-1024.webp 1024w, /bg/grey-hills-1280.webp 1280w, /bg/grey-hills-1920.webp 1920w",
    alt: "Full moon over grey hills",
  },
  {
    src: "/bg/crane-man-1280.webp",
    srcset: "/bg/crane-man-768.webp 768w, /bg/crane-man-1024.webp 1024w, /bg/crane-man-1280.webp 1280w, /bg/crane-man-1440.webp 1440w, /bg/crane-man-1920.webp 1920w",
    alt: "Crane, Butterfly & Rain-Man",
  },
]
</script>

<style scoped></style>
