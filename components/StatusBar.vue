<template>
    <div class="sm:flex sm:items-center sm:justify-between">
        <div class="flex items-end space-x-5">
            <div class="flex-shrink-0">
                <img v-if="user" class="w-16 h-16 mx-auto rounded-full" :src="user.photoURL" :alt="user.displayName" />
                <div v-else class="w-16 h-16 mx-auto rounded-full"></div>
            </div>
            <div class="mt-4 text-center sm:mt-0 sm:pt-1 sm:text-left">
                <!-- <p class="text-sm font-medium text-white">ID: {{ user.uid }}</p> -->
                <p class="text-xl font-bold text-black opacity-0 sm:opacity-100 sm:text-2xl">{{ user.displayName }}</p>
            </div>
        </div>
        <div class="flex justify-center mt-5 sm:mt-0">
            <a href="#"
                class="flex items-center justify-center px-3 py-2 text-sm font-semibold text-gray-900 bg-white rounded-md shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">View
                Progress</a>
        </div>
    </div>
</template>

<script setup lang="ts">
const { user, player } = defineProps(["user", "player"]);


</script>

<style scoped></style>