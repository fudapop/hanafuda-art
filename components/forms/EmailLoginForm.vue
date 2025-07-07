<template>
  <div>
    <form
      class="space-y-4 min-w-[300px] border-border/20"
      action=""
      @submit.prevent="handleEmailLogin"
    >
      <div>
        <label
          for="email"
          class="block text-sm font-medium leading-6 text-text"
          >Email address</label
        >
        <div class="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            required
            class="block w-full rounded-sm border-0 py-1.5 text-text bg-surface shadow-sm ring-1 ring-inset ring-border placeholder:text-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            v-model="values.email"
            @blur="rememberEmail"
          />
        </div>
      </div>

      <div>
        <label
          for="password"
          class="block text-sm font-medium leading-6 text-text"
          >Password</label
        >
        <div class="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            class="block w-full rounded-sm border-0 py-1.5 text-text bg-surface shadow-sm ring-1 ring-inset ring-border placeholder:text-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
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
          class="space-y-4 text-xs text-text-secondary min-h-40"
        >
          <div class="space-y-2">
            <p>Password must contain at least:</p>
            <ul class="grid grid-cols-2 list-none list-inside">
              <li
                v-for="requirement in requirements"
                :key="requirement.text"
                :class="{
                  'text-hanafuda-green relative': requirement.valid,
                  'text-primary relative': !requirement.valid,
                }"
              >
                <CheckIcon
                  v-if="requirement.valid"
                  class="inline w-3 h-3 mr-1 text-hanafuda-green"
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
            :disabled="!isValidPassword.value || !values.email"
            :class="{
              'w-full text-gray-900 dark:text-white action-button bg-border': true,
              'opacity-50 cursor-not-allowed': !isValidPassword.value || !values.email,
            }"
          >
            Sign Up
          </button>

          <a
            v-show="!query.signup"
            href="#"
            class="block w-full mt-2 text-sm text-center text-text-secondary hover:underline hover:text-primary"
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
            <div class="flex items-center cursor-pointer">
              <input
                id="remember-me"
                ref="remember-me"
                name="remember-me"
                type="checkbox"
                class="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                v-model="rememberMe"
                @change="rememberEmail"
              />
              <label
                for="remember-me"
                class="block ml-3 text-sm leading-6 cursor-pointer text-text"
                >Remember me</label
              >
            </div>

            <div class="text-sm leading-6">
              <a
                href="#"
                class="text-text-secondary hover:underline hover:text-primary"
                @click="handleForgotPassword"
                >Forgot password?</a
              >
            </div>
          </div>
          <div>
            <button
              type="submit"
              class="w-full text-gray-900 dark:text-white action-button bg-border"
            >
              Sign In
            </button>

            <a
              href="#"
              class="block w-full mt-2 text-sm text-center text-text-secondary hover:underline hover:text-primary"
              @click="newAccount = true"
            >
              I don&apos;t have an account
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
  userIsGuest.value ? linkWithEmail : newAccount.value ? signUpWithEmail : loginWithEmail,
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
