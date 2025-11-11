<template>
  <ContentLayout>
    <div class="min-h-screen">
      <!-- Hero Section -->
      <section class="relative px-4 py-20 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl">
          <div class="text-center">
            <h1 class="mb-6 text-4xl font-bold md:text-6xl text-foreground text-balance">
              Experience the Art of
              <span class="block text-primary">Koi-Koi</span>
            </h1>
            <p class="mb-8 text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
              Immerse yourself in the traditional Japanese card game of Hanafuda. Master the elegant
              strategy of Koi-Koi and discover centuries of cultural heritage.
            </p>
            <div class="flex justify-center">
              <NuxtLink
                to="/"
                class="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#23221c] bg-linear-to-b from-amber-100 to-amber-200 dark:from-amber-200 dark:to-amber-300 hover:from-amber-200 hover:to-amber-300 dark:hover:from-amber-300 dark:hover:to-amber-400 border-2 border-[#23221c] shadow-md hover:border-primary transition-all duration-200 rounded-xs min-w-[150px]"
              >
                🎴 Play Now
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- Rules Section (for SEO) -->
      <section class="px-4 py-16 sm:px-6 lg:px-8 bg-muted/30">
        <div class="mx-auto max-w-4xl">
          <h2 class="mb-8 text-3xl font-bold text-center md:text-4xl text-foreground">
            How to Play Hanafuda Koi-Koi
          </h2>
          <div class="prose prose-lg dark:prose-invert max-w-none">
            <div class="space-y-6 text-muted-foreground">
              <div>
                <h3 class="text-xl font-semibold text-foreground mb-2">Objective</h3>
                <p>
                  Koi-Koi is a traditional Japanese card game played with Hanafuda (flower cards).
                  The goal is to score points by collecting sets of cards called "yaku". The player
                  with the most points at the end of the game wins.
                </p>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-foreground mb-2">Gameplay</h3>
                <p>
                  Each player is dealt a hand of cards. On your turn, you play a card from your hand
                  and match it with a card on the field that shares the same suit (month). When you
                  collect a yaku, you can choose to continue playing (calling "Koi-Koi") to try for
                  more points, or stop to secure your current score.
                </p>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-foreground mb-2">Scoring</h3>
                <p>
                  Points are awarded based on the yaku you collect. Common yaku include Five Brights
                  (15 points), Four Brights (8 points), Flower Viewing (5 points), and many more.
                  Calling "Koi-Koi" doubles your points if you win, but you lose everything if your
                  opponent wins the round.
                </p>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-foreground mb-2">The Deck</h3>
                <p>
                  A Hanafuda deck consists of 48 cards representing 12 months. Each month has 4
                  cards: typically one bright card, one animal card, one ribbon card, and one plain
                  card. The cards feature beautiful seasonal flowers and imagery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="px-4 py-16 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-4xl">
          <h2 class="mb-12 text-3xl font-bold text-center md:text-4xl text-foreground">
            Customize Your Experience
          </h2>
          <div class="grid gap-8 md:grid-cols-2">
            <!-- Choose Your Deck Feature -->
            <div
              class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
            >
              <div class="mb-4 text-4xl">🎴</div>
              <h3 class="mb-3 text-xl font-semibold text-foreground">Choose Your Deck</h3>
              <p class="mb-4 text-muted-foreground">
                Select from multiple beautiful Hanafuda card designs, each featuring unique artwork
                by talented artists. Customize your game with the deck that speaks to you.
              </p>
            </div>

            <!-- Customize Your Rules Feature -->
            <div
              class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
            >
              <div class="mb-4 text-4xl">⚙️</div>
              <h3 class="mb-3 text-xl font-semibold text-foreground">Customize Your Rules</h3>
              <p class="mb-4 text-muted-foreground">
                Adjust game settings to match your preferred play style. Modify scoring rules, game
                length, and other options to create the perfect Koi-Koi experience for you.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
const { t } = useI18n()

useSeoMeta({
  title: 'New Hanafuda | How to Play Hanafuda Koi-Koi - Rules & Guide',
  description:
    'Learn how to play Hanafuda Koi-Koi, the traditional Japanese card game. Complete rules guide, scoring, and gameplay instructions. Play online with customizable decks and rules.',
  ogTitle: 'New Hanafuda | How to Play Hanafuda Koi-Koi',
  ogDescription:
    'Learn how to play Hanafuda Koi-Koi online. Complete rules guide with scoring and gameplay instructions.',
  ogImage:
    'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/og-image-large.png',
  ogUrl: 'https://newhanafuda.art/about',
  twitterCard: 'summary_large_image',
  twitterTitle: 'New Hanafuda | How to Play Hanafuda Koi-Koi',
  twitterDescription: 'Complete rules guide for playing Hanafuda Koi-Koi online.',
  twitterImage:
    'https://ymoriyakbittfgocvxbw.supabase.co/storage/v1/object/public/static/assets/og-image-large.png',
})
</script>
