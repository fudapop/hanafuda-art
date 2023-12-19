<template>
  <div class="max-h-[calc(100dvh-84px)] [@media(max-height:500px)]:max-h-[100dvh] xs:max-h-[75vh] overflow-y-auto pb-4">
    <div class="grid p-3 mb-2 max-sm:grid-rows-2 sm:grid-cols-2">
      <div class="relative pointer-events-none isolate">
        <svg
          class="absolute inset-x-0 top-0 -z-10 h-[16rem] w-full stroke-gray-200 dark:stroke-gray-600 [mask-image:radial-gradient(8rem_8rem_at_center,white,transparent)]"
          aria-hidden="true">
          <defs>
            <pattern id="1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84" width="200" height="200" x="50%" y="-1"
              patternUnits="userSpaceOnUse">
              <path d="M.5 200V.5H200" fill="none" />
            </pattern>
          </defs>
          <svg x="50%" y="-1" class="overflow-visible fill-gray-50 dark:opacity-10">
            <path d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
              stroke-width="0" />
          </svg>
          <rect width="100%" height="100%" stroke-width="0" fill="url(#1f932ae7-37de-4c0a-a8b0-a6e3b4d44b84)" />
        </svg>
        <div class="absolute top-0 right-0 -ml-6 overflow-hidden left-1/3 -z-10 transform-gpu blur-3xl lg:ml-6 xl:ml-12"
          aria-hidden="true">
          <div class="aspect-[4/5] w-[200px] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30" style="
            clip-path: polygon(
              63.1% 29.5%,
              100% 17.1%,
              76.6% 3%,
              48.4% 0%,
              44.6% 4.7%,
              54.5% 25.3%,
              59.8% 49%,
              55.2% 57.8%,
              44.4% 57.2%,
              27.8% 47.9%,
              35.1% 81.5%,
              0% 97.7%,
              39.2% 100%,
              35.2% 81.4%,
              97.2% 52.8%,
              63.1% 29.5%
            );
          " />
        </div>
        <AnimatedCards />
        <button type="button" @click="handleLike" class="absolute pointer-events-auto max-sm:bottom-5 max-sm:left-5 sm:top-5 sm:right-5 focus-visible:ring-1 focus-visible:ring-indigo-600 focus-visible:dark:ring-yellow-300">
          <HeartIcon :aria-hidden="true"
            :class="['w-8 h-auto stroke-gray-500 stroke-1 drop-shadow-md', isLiked ? 'fill-red-600 stroke-red-400' : '']" />
        </button>
      </div>
      <div class="h-full space-y-4 p-4 my-3 rounded-lg shadow-inner bg-gray-50 dark:bg-[#40495a] dark:text-white">
        <h3 class="text-lg font-semibold tracking-wide text-gray-900 dark:text-white">{{ designInfo.title }}</h3>
        <p>
          {{ designInfo.attribution }}
        </p>
        <a :href="designInfo.url" target="_blank"
          class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4">
          {{ designInfo.urlDescription }} &rarr;
        </a>
        <p v-if="designInfo.contributor">
          Contributed by 
          <a :href="designInfo.contributorUrl" target="_blank"
            class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4">
            {{ designInfo.contributor }}
          </a>
        </p>
      </div>
    </div>
    <DesignRadioGroup />
  </div>
</template>

<script setup lang="ts">
import { HeartIcon } from '@heroicons/vue/24/outline';

const { useDesign, fetchCardUrls, getDesignInfo } = useCardDesign();

const currentUser = toValue(useProfile().current)
const userIsGuest = toValue(computed(() => currentUser?.isGuest))
const userLiked = toValue(computed(() => currentUser?.designs.liked));

const currentDesign = useDesign();

const designInfo = computed(() => getDesignInfo(currentDesign.value));

const isLiked = computed(() => userLiked?.includes(currentDesign.value));
const handleLike = () => {
  if (!userLiked) return;
  if (isLiked.value) {
    userLiked.splice(userLiked.indexOf(currentDesign.value), 1);
  } else {
    userLiked.push(currentDesign.value);
  }
}

const preloadTags = ref();
const preloadHead = useHead({});

const preloadImages = () => {
  fetchCardUrls().then((urlMap) => {
    preloadTags.value = [...urlMap.values()].map((url) => ({
      rel: "preload",
      href: url,
      as: "image",
    }));
    preloadHead?.patch({
      link: preloadTags.value,
    });
  });
}

onMounted(() => {
  if (userIsGuest) {
    currentDesign.value = "cherry-version";
  } else {
    currentDesign.value = userLiked?.[0] || "cherry-version";
  }
  useHead(
    {
      link: [{ rel: "preconnect", href: "https://firebasestorage.googleapis.com" }],
    },
    { tagPriority: "high" }
  );
  preloadImages();
  watch(currentDesign, preloadImages);
});

</script>
