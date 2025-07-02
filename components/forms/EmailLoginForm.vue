<template>
  <div>
    <form
      class="space-y-4 min-w-[300px] border-t pt-4 border-gray-400/20"
      action=""
      @submit.prevent="handleEmailLogin"
    >
      <div>
        <label
          for="email"
          class="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
          >Email address</label
        >
        <div class="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            v-model="values.email"
            @blur="rememberEmail"
          />
        </div>
      </div>

      <div>
        <label
          for="password"
          class="block text-sm font-medium leading-6 text-gray-900 dark:text-white"
          >Password</label
        >
        <div class="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            v-model="values.password"
          />
        </div>
      </div>

      <Transition
        name="section"
        mode="out-in"
        tag="div"
      >
        <section
          v-if="newAccount"
          class="space-y-4 text-xs text-gray-600 dark:text-gray-300 min-h-40"
        >
          <div class="space-y-2">
            <p>Password must contain at least:</p>
            <ul class="grid grid-cols-2 list-none list-inside">
              <li
                v-for="requirement in requirements"
                :key="requirement.text"
                :class="{
                  'text-green-500 relative': requirement.valid,
                  'text-red-500 relative': !requirement.valid,
                }"
              >
                <CheckIcon
                  v-if="requirement.valid"
                  class="inline w-3 h-3 mr-1 text-green-500"
                />
                <span
                  v-else
                  class="inline-block w-3 h-3 mr-1"
                />
                {{ requirement.text }}
              </li>
            </ul>
          </div>
          <button
            type="submit"
            :disabled="!isValidPassword.value"
            :class="{
              'flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600': true,
              'opacity-50 cursor-not-allowed': !isValidPassword.value,
            }"
          >
            Sign up
          </button>

          <a
            v-show="!query.signup"
            href="#"
            class="block w-full mt-2 text-sm text-center text-indigo-500 hover:text-indigo-400"
            @click="newAccount = false"
          >
            I already have an account &rarr;
          </a>
        </section>

        <section
          v-else
          class="space-y-4 min-h-40"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                ref="remember-me"
                name="remember-me"
                type="checkbox"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-600"
                v-model="rememberMe"
                @change="rememberEmail"
              />
              <label
                for="remember-me"
                class="block ml-3 text-sm leading-6 text-gray-900 dark:text-white"
                >Remember me</label
              >
            </div>

            <div class="text-sm leading-6">
              <a
                href="#"
                class="font-semibold text-indigo-600 hover:text-indigo-500"
                @click="handleForgotPassword"
                >Forgot password?</a
              >
            </div>
          </div>
          <div>
            <button
              type="submit"
              class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Sign in
            </button>

            <a
              href="#"
              class="block w-full mt-2 text-sm text-center text-indigo-500 hover:text-indigo-400"
              @click="newAccount = true"
            >
              I don&apos;t have an account &rarr;
            </a>
          </div>
        </section>
      </Transition>
    </form>
    <LazyPasswordResetForm
      :open="showResetModal"
      @cancel="() => (showResetModal = false)"
    />
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/20/solid'
import { useStorage } from '@vueuse/core'

const emit = defineEmits(['success', 'error', 'linked'])

const { useGuest, linkWithEmail, loginWithEmail, signUpWithEmail } = useAuth()

const newAccount = ref<boolean>(useRoute().query.signup === 'true')
const rememberedEmail = useStorage('hanafuda-email', '', localStorage, { mergeDefaults: true })
const rememberMe = ref<boolean>(rememberedEmail.value !== '')
const rememberEmail = () => {
  rememberedEmail.value = rememberMe.value ? values.email : ''
}
const values = reactive({
  email: rememberedEmail.value,
  password: '',
})

const { query } = useRoute()
const userIsGuest = ref<boolean>(false)

const emailAction = computed(() =>
  userIsGuest.value ? linkWithEmail
  : newAccount.value ? signUpWithEmail
  : loginWithEmail,
)

const handleEmailLogin = () => {
  if (!isValidPassword.value) return
  emailAction.value(values.email, values.password).then((success) => {
    if (success) {
      if (userIsGuest.value) {
        emit('linked')
      } else {
        emit('success')
      }
    } else {
      emit('error')
    }
  })
}

const hasNumber = computed(() => /\d/.test(values.password))
const hasUpper = computed(() => /[A-Z]/.test(values.password))
const hasLower = computed(() => /[a-z]/.test(values.password))
const hasSpecial = computed(() => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(values.password))
const hasSufficientLength = computed(() => values.password.length >= 6)

const requirements = computed(() => [
  { valid: hasSufficientLength.value, text: '6 characters' },
  { valid: hasNumber.value, text: '1 number' },
  { valid: hasUpper.value, text: '1 uppercase letter' },
  { valid: hasLower.value, text: '1 lowercase letter' },
  { valid: hasSpecial.value, text: '1 special character' },
])

const isValidPassword = computed(() => {
  return hasSufficientLength && hasNumber && hasUpper && hasLower && hasSpecial
})

const showResetModal = ref(false)
const handleForgotPassword = () => {
  showResetModal.value = true
}

onMounted(() => {
  userIsGuest.value = Boolean(useGuest().value.uid)
})
</script>

<style scoped>
.section-enter-active,
.section-leave-active {
  transition: all 0.5s ease;
}

.section-enter-from,
.section-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
