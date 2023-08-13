<template>
  <div class="absolute inset-0 flex flex-col items-center m-auto">
    <div class="relative mt-32 drop-shadow-xl">
      <div class="absolute right-[2rem] bottom-[10%] rotate-12 -z-10">
        <AnimatedCards />
      </div>
      <h1 id="hero-title" class="text-4xl text-center sm:text-5xl">
        <span class="block text-xl italic text-left text-white md:text-3xl">Hanafuda</span>花札 KOI-KOI
      </h1>
    </div>
    <div class="absolute inset-x-0 mx-auto text-2xl shadow-lg w-max top-1/2">
      <Button button-class="primary" :style="{ fontSize: '1.5rem', padding: '1rem 1.5rem', borderRadius: '0.75rem' }" :action="() => $emit('start-game')">
        Start Game
      </Button>
    </div>
    <p class="fixed bottom-0 w-screen mb-2 text-xs text-center text-white opacity-50">
      {{ new Date().getFullYear() }} | Andre L. Hammons
    </p>
  </div>
</template>

<script setup lang="ts">
defineEmits(["start-game"])
</script>

<style scoped>
#hero-title {
  background: linear-gradient(15deg, gold, palegoldenrod, lightgoldenrodyellow);
  background-clip: text;
  color: transparent;
  font-family: "Potta One", sans-serif;
  font-weight: 700;
  max-width: 500px;
  margin: 0 auto;
  z-index: 1;
}
</style>