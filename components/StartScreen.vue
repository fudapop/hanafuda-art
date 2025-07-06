<template>
  <div class="absolute inset-0 flex flex-col items-center m-auto">
    <div class="relative my-auto drop-shadow-xl [@media(max-height:500px)]:scale-75">
      <div class="absolute right-8 bottom-1/4 rotate-12 -z-10">
        <AnimatedCards />
      </div>
      <h1
        id="hero-title"
        class="text-4xl text-center sm:text-5xl"
      >
        <span class="block text-xl italic text-left text-white sm:text-3xl">Hanafuda</span>花札
        KOI-KOI
      </h1>
    </div>
    <!-- <button
      id="start-button"
      type="button"
      :class="['px-8 py-3 text-xl rounded-lg pri-btn', 'absolute top-0 m-auto']"
      @click="testGame"
    >
      Test play
    </button> -->

    <div
      class="absolute flex flex-col items-center w-max top-3/4 gap-y-4 [@media(max-height:500px)]:scale-75"
    >
      <div class="flex gap-4 [@media(min-height:500px)]:flex-col">
        <button
          id="start-button"
          type="button"
          :class="['px-6 py-2 text-lg rounded-lg pri-btn']"
          @click="() => $emit('start-game')"
        >
          Play now
        </button>
        <button
          id="account-link-button"
          v-if="userIsGuest"
          type="button"
          class="px-6 py-2 text-lg font-medium text-white bg-transparent rounded-lg hover:bg-gray-500/50 sec-btn"
          @click="goToLogin"
        >
          Sign up
        </button>
      </div>
      <p
        v-if="userIsGuest"
        role="link"
        id="sign-in-link"
        @click="handleSignin"
        class="text-xs text-center text-gray-300 cursor-pointer dark:text-white hover:underline"
      >
        Sign in to an existing account &rarr;
      </p>
    </div>
    <StartScreenFooter />

    <AnnouncementModal />
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['start-game'])
const testPlay = useState('test', () => false)
const gameStart = useState('gameStart')
const { userIsGuest, logout } = useAuth()

const testGame = () => {
  testPlay.value = true
  emit('start-game')
}

const goToLogin = () => {
  navigateTo({ path: '/login', query: { signup: 'true' } })
}

const handleSignin = () => {
  logout()
  navigateTo({ path: '/login', query: { exit: 'true' } })
}

watch(gameStart, () => {
  if (!gameStart.value) {
    testPlay.value = false
  }
})
</script>

<style scoped>
#hero-title {
  background: linear-gradient(15deg, gold, palegoldenrod, lightgoldenrodyellow);
  background-clip: text;
  color: transparent;
  font-family: 'Potta One', sans-serif;
  font-weight: 700;
  max-width: 500px;
  margin: 0 auto;
  z-index: 1;
}
</style>
