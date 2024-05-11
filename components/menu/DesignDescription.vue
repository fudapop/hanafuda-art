<template>
	<div class="my-4 space-y-2">
		<h3 class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">{{ info.title }}</h3>
		<p>
		{{ info.description }}
		</p>
		<a v-if="info.url" :href="info.url" target="_blank"
		class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4">
		{{ info.urlDescription }} &rarr;
		</a>
		<p v-if="info.contributor">
		Contributed by 
		<a :href="info.contributorUrl" target="_blank"
				class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4">
				{{ info.contributor }}
		</a>
		</p>
	</div>
</template>

<script setup lang="ts">
const { design } = defineProps<{ design: CardDesign }>()

const info = computed(() => useCardDesign().getDesignInfo(design))
</script>
