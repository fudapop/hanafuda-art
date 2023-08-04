<template>
  <div>
    <nuxt-img v-if="url" :src="url" :alt="card"> </nuxt-img>
  </div>
</template>

<script setup lang="ts">
import { ref as storageRef } from "firebase/storage";
import { useFirebaseStorage, useStorageFileUrl } from "vuefire";
import { CardName } from "~/utils/cards";

// useDesignPath()
const { card, imgUrl } = defineProps<{ card: CardName; imgUrl: string }>();

const storage = useFirebaseStorage();
const imageFileRef = storageRef(storage, imgUrl);
const {
  url,
  // refresh the url if the file changes
  refresh,
} = useStorageFileUrl(imageFileRef);
</script>

<style scoped></style>
