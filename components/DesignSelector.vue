<template>
  <div class="grid p-3 sm:grid-cols-2">
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
      <AnimatedCards class="pointer-events-auto" />
    </div>
    <div>
      <label for="card-design" class="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Card
        Design</label>
      <select id="card-design" name="card-design"
        class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 dark:bg-gray-800 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 dark:focus:ring-yellow-100 sm:text-sm sm:leading-6"
        v-model="currentDesign">
        <option v-for="design in designOptions" :key="design" :value="design" :selected="currentDesign === design">
          {{ getDesignInfo(design).title }}
        </option>
        <template v-if="userIsGuest">
          <option value="" disabled>...</option>
          <option value="" disabled>
              Create a free account to see more!
          </option>
        </template>
      </select>
      <div class="p-4 my-3 bg-white border rounded-lg shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white">
        <p class="mb-4">
          {{ designInfo.attribution }}
        </p>
        <a :href="designInfo.url" target="_blank"
          class="text-indigo-600 dark:text-yellow-300 hover:text-indigo-500 dark:hover:text-yellow-100 hover:underline underline-offset-4">
          {{ designInfo.urlDescription }} &rarr;
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CardDesign } from '~/composables/useCardDesign';

const { useDesign, fetchCardUrls, DESIGNS, getDesignInfo } = useCardDesign();

const userIsGuest = computed(() => useCurrentUser().value?.isAnonymous)

const currentDesign = useDesign();
const designOptions = userIsGuest ? [currentDesign.value, getRandom([...DESIGNS].filter(d => d !== currentDesign.value))] : DESIGNS;

const designInfo = computed(() => getDesignInfo(currentDesign.value));

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
      bodyAttrs: { class: currentDesign },
      link: preloadTags.value,
    });
  });
}

onMounted(() => {
  if (userIsGuest) {
    currentDesign.value = "cherry-version";
  } else {
    currentDesign.value = (localStorage.getItem("hanafuda-design-pref") || "cherry-version") as CardDesign;
  }
  useHead(
    {
      link: [{ rel: "preconnect", href: "https://firebasestorage.googleapis.com" }],
    },
    { tagPriority: "high" }
  );
  preloadImages();
  watch(currentDesign, () => {
    preloadImages();
    if (userIsGuest) return;
    localStorage.setItem("hanafuda-design-pref", currentDesign.value);
  });
});

</script>
