<template>
  <div class="p-3 grid sm:grid-cols-2">
    <div>
      <AnimatedCards />
    </div>
    <div>
      <label for="card-design" class="block text-sm font-medium leading-6 text-gray-900"
        >Card Design</label
      >
      <select
        id="card-design"
        name="card-design"
        class="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
        v-model="currentDesign"
      >
        <option
          v-for="design in DESIGNS"
          :key="design"
          :value="design"
          :selected="currentDesign === design"
        >
          {{ getDesignInfo(design).title }}
        </option>
      </select>
      <div class="rounded-lg border bg-white p-4 shadow-sm my-3">
        <p class="mb-4">
          {{ designInfo.attribution }}
        </p>
        <a
          :href="designInfo.url"
          target="_blank"
          class="text-indigo-600 hover:text-indigo-500 hover:underline underline-offset-4"
        >
          {{ designInfo.urlDescription }} &rarr;
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { useDesign, fetchCardUrls, DESIGNS, getDesignInfo } = useCardDesign();

const currentDesign = useDesign();
const selectedDesign = ref(currentDesign.value);

const designInfo = computed(() => getDesignInfo(currentDesign.value));

const preloadTags = ref();

onMounted(() => {
  // @ts-ignore
  //   currentDesign.value = localStorage.getItem("hanafuda-design-pref") || "cherry-version";
  useHead(
    {
      link: [{ rel: "preconnect", href: "https://firebasestorage.googleapis.com" }],
    },
    { tagPriority: "high" }
  );
  const preloadHead = useHead({});
  watchEffect(() => {
    localStorage.setItem("hanafuda-design-pref", currentDesign.value);
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
  });
});
</script>
