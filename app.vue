<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
import "vant/lib/index.css";
import { Loading } from "vant";

useNuxtApp().vueApp.use(Loading);

</script>
