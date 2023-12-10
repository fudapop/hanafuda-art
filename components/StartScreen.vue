<template>
  <div class="absolute inset-0 flex flex-col items-center m-auto">
    <div class="relative my-auto drop-shadow-xl">
      <div class="absolute right-8 bottom-1/4 rotate-12 -z-10">
        <AnimatedCards />
      </div>
      <h1 id="hero-title" class="text-4xl text-center sm:text-5xl">
        <span class="block text-xl italic text-left text-white sm:text-3xl">Hanafuda</span
        >花札 KOI-KOI
      </h1>
    </div>
    <div class="absolute shadow-lg w-max top-3/4">
      <button
        type="button"
        class="px-8 py-3 text-xl rounded-lg pri-btn"
        @click="() => $emit('start-game')"
      >
        Start
      </button>
    </div>
    <StartScreenFooter />
  </div>
</template>

<script setup lang="ts">
defineEmits(["start-game"]);
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
