<template>
  <PageLayout>
    <HeroSection />
    <section
      id="browse-designs"
      class="px-6 grid w-full max-w-xl lg:shrink-0 xl:max-w-2xl mx-auto"
    >
      <h2
        class="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl"
      >
        Featured Designs
      </h2>
      <div class="max-w-[640px] mt-8">
        <DesignSelector />
      </div>
      <!-- <Features /> -->
    </section>
    <Footer />
  </PageLayout>
</template>

<script setup></script>
