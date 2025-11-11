<template>
  <div class="min-h-screen bg-background">
    Header
    <header class="border-b-2 border-border bg-card">
      <div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div class="flex items-center justify-between py-4">
          <div class="flex items-center space-x-4">
            <div class="text-2xl font-bold text-primary">花札</div>
            <div class="text-lg font-semibold text-foreground">HANAFUDA</div>
          </div>
          <nav class="hidden space-x-8 md:flex">
            <a
              href="#play"
              class="transition-colors text-foreground hover:text-primary"
              >Play</a
            >
            <a
              href="#learn"
              class="transition-colors text-foreground hover:text-primary"
              >Learn</a
            >
            <a
              href="#gallery"
              class="transition-colors text-foreground hover:text-primary"
              >Gallery</a
            >
            <a
              href="#community"
              class="transition-colors text-foreground hover:text-primary"
              >Community</a
            >
          </nav>
          <button class="md:hidden text-foreground">
            <svg
              class="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </header>

    Hero Section
    <section class="relative px-4 py-20 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div class="text-center lg:text-left">
            <h1 class="mb-6 text-4xl font-bold md:text-6xl text-foreground text-balance">
              Experience the Art of
              <span class="block text-primary">Koi-Koi</span>
            </h1>
            <p class="mb-8 text-xl text-muted-foreground text-pretty">
              Immerse yourself in the traditional Japanese card game of Hanafuda. Master the elegant
              strategy of Koi-Koi and discover centuries of cultural heritage.
            </p>
            <div class="flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <button
                class="px-8 py-4 text-lg font-semibold transition-opacity rounded-lg bg-primary text-primary-foreground hover:opacity-90"
              >
                🎴 Play Now
              </button>
              <button
                class="px-8 py-4 text-lg font-semibold transition-colors border-2 rounded-lg border-border text-foreground hover:bg-muted"
              >
                📚 Learn Rules
              </button>
            </div>
          </div>
          <div class="relative">
            <div class="p-6 border-4 rounded-lg shadow-lg border-border bg-card">
              <img
                src="/og-image-large.png"
                alt="Hanafuda Koi-Koi Game Interface"
                class="w-full h-auto rounded-md"
              />
            </div>
            Decorative elements
            <div
              class="absolute w-8 h-8 border-4 rounded-full -top-4 -left-4 border-border bg-background"
            ></div>
            <div
              class="absolute w-8 h-8 border-4 rounded-full -bottom-4 -right-4 border-border bg-background"
            ></div>
          </div>
        </div>
      </div>
    </section>

    Features Section
    <section class="py-20 bg-muted">
      <div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div class="mb-16 text-center">
          <h2 class="mb-4 text-3xl font-bold md:text-4xl text-foreground">Discover Hanafuda</h2>
          <p class="max-w-2xl mx-auto text-xl text-muted-foreground">
            Explore the rich world of traditional Japanese card gaming
          </p>
        </div>

        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">🎴</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Play Koi-Koi</h3>
            <p class="mb-4 text-muted-foreground">
              Challenge yourself with the classic Hanafuda game. Master the art of collecting yaku
              combinations.
            </p>
            <button class="font-semibold text-primary hover:underline">Start Playing →</button>
          </div>

          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">🎨</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Submit Art</h3>
            <p class="mb-4 text-muted-foreground">
              Share your Hanafuda-inspired artwork with our community of players and artists.
            </p>
            <button class="font-semibold text-primary hover:underline">Upload Art →</button>
          </div>

          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">📖</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Learn History</h3>
            <p class="mb-4 text-muted-foreground">
              Discover the fascinating 400-year history of Hanafuda cards and their cultural
              significance.
            </p>
            <button class="font-semibold text-primary hover:underline">Explore History →</button>
          </div>

          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">👥</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Join Community</h3>
            <p class="mb-4 text-muted-foreground">
              Connect with fellow Hanafuda enthusiasts, share strategies, and participate in
              tournaments.
            </p>
            <button class="font-semibold text-primary hover:underline">Join Now →</button>
          </div>

          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">🏆</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Tournaments</h3>
            <p class="mb-4 text-muted-foreground">
              Compete in seasonal tournaments and climb the leaderboards to become a Koi-Koi master.
            </p>
            <button class="font-semibold text-primary hover:underline">View Tournaments →</button>
          </div>

          <div
            class="p-6 transition-shadow border-2 rounded-lg bg-card border-border hover:shadow-lg"
          >
            <div class="mb-4 text-3xl">📱</div>
            <h3 class="mb-3 text-xl font-semibold text-foreground">Mobile Ready</h3>
            <p class="mb-4 text-muted-foreground">
              Play anywhere, anytime. Our responsive design works perfectly on all your devices.
            </p>
            <button class="font-semibold text-primary hover:underline">Download App →</button>
          </div>
        </div>
      </div>
    </section>

    Cultural Section
    <section class="py-20">
      <div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div class="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 class="mb-6 text-3xl font-bold md:text-4xl text-foreground">A Living Tradition</h2>
            <p class="mb-6 text-lg text-muted-foreground">
              Hanafuda cards represent the changing seasons through beautiful floral imagery. Each
              month is depicted through its characteristic flowers, creating a poetic calendar that
              has captivated players for centuries.
            </p>
            <p class="mb-8 text-lg text-muted-foreground">
              Koi-Koi, meaning "come on" in Japanese, is the most popular Hanafuda game. Players
              must decide whether to continue playing for higher points or stop and secure their
              current score - a thrilling balance of risk and reward.
            </p>
            <div class="flex flex-wrap gap-4">
              <span
                class="px-4 py-2 text-sm font-semibold rounded-full bg-primary text-primary-foreground"
              >
                Traditional
              </span>
              <span
                class="px-4 py-2 text-sm font-semibold rounded-full bg-muted text-muted-foreground"
              >
                Strategic
              </span>
              <span
                class="px-4 py-2 text-sm font-semibold rounded-full bg-muted text-muted-foreground"
              >
                Cultural
              </span>
            </div>
          </div>
          <div class="relative">
            <div class="p-8 text-center border-2 rounded-lg bg-card border-border">
              <div class="mb-4 text-6xl">🌸</div>
              <h3 class="mb-4 text-2xl font-bold text-foreground">12 Months</h3>
              <p class="mb-6 text-muted-foreground">
                Each suit represents a month of the year, from January's Pine to December's
                Paulownia
              </p>
              <div class="grid grid-cols-4 gap-2 text-2xl">
                <span>🌲</span><span>🌸</span><span>🌺</span><span>🌿</span> <span>🌼</span
                ><span>🌹</span><span>🍀</span><span>🌾</span> <span>🍂</span><span>🍁</span
                ><span>⚡</span><span>🌳</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    CTA Section
    <section class="py-20 bg-primary text-primary-foreground">
      <div class="max-w-4xl px-4 mx-auto text-center sm:px-6 lg:px-8">
        <h2 class="mb-6 text-3xl font-bold md:text-4xl text-balance">Ready to Master Koi-Koi?</h2>
        <p class="mb-8 text-xl opacity-90 text-pretty">
          Join thousands of players discovering the beauty and strategy of traditional Hanafuda
        </p>
        <div class="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            class="px-8 py-4 text-lg font-semibold transition-opacity rounded-lg bg-primary-foreground text-primary hover:opacity-90"
          >
            🎴 Start Your Journey
          </button>
          <button
            class="px-8 py-4 text-lg font-semibold transition-colors border-2 rounded-lg border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
          >
            📖 View Tutorial
          </button>
        </div>
      </div>
    </section>

    Footer
    <footer class="py-12 bg-foreground text-background">
      <div class="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div class="grid gap-8 md:grid-cols-4">
          <div>
            <div class="flex items-center mb-4 space-x-2">
              <div class="text-xl font-bold text-primary">花札</div>
              <div class="text-sm font-semibold">HANAFUDA</div>
            </div>
            <p class="text-sm opacity-80">
              Experience the traditional Japanese card game in a modern digital format.
            </p>
          </div>

          <div>
            <h4 class="mb-4 font-semibold">Game</h4>
            <ul class="space-y-2 text-sm opacity-80">
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Play Koi-Koi</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Rules & Tutorial</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Tournaments</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Leaderboards</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h4 class="mb-4 font-semibold">Community</h4>
            <ul class="space-y-2 text-sm opacity-80">
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Submit Art</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Gallery</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Forums</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Discord</a
                >
              </li>
            </ul>
          </div>

          <div>
            <h4 class="mb-4 font-semibold">Learn</h4>
            <ul class="space-y-2 text-sm opacity-80">
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Hanafuda History</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Card Meanings</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Strategy Guide</a
                >
              </li>
              <li>
                <a
                  href="#"
                  class="transition-colors hover:text-primary"
                  >Cultural Context</a
                >
              </li>
            </ul>
          </div>
        </div>

        <div class="pt-8 mt-8 text-sm text-center border-t border-background/20 opacity-60">
          <p>&copy; 2024 Hanafuda Koi-Koi. Preserving tradition through digital innovation.</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
// Vue 3 Composition API setup
// Add any reactive data or methods here if needed
</script>

<style scoped>
/* Additional custom styles if needed */
</style>
