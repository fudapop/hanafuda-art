<template>
  <ContentLayout>
    <div class="relative isolate flow-root min-h-dvh px-4 pb-16 pt-20">
      <div
        class="mx-auto mt-4 w-full max-w-md rounded-md bg-white px-4 py-8 shadow-lg dark:bg-hanafuda-cream"
      >
        <h1 class="text-balance text-center text-xl font-semibold text-text">
          {{ heading }}
        </h1>
        <p class="mt-3 text-center text-sm leading-6 text-text-secondary">
          {{ body }}
        </p>

        <form
          v-if="showPasswordForm"
          class="mt-6 space-y-4"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label
              for="new-password"
              class="block text-sm font-medium leading-6 text-text"
              >{{ t('auth.action.newPassword') }}</label
            >
            <input
              id="new-password"
              v-model="password"
              name="new-password"
              type="password"
              autocomplete="new-password"
              required
              class="mt-1 block w-full rounded-xs border-0 bg-surface py-1.5 text-text shadow-xs ring-1 ring-inset ring-border placeholder:text-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
          </div>
          <div>
            <label
              for="confirm-password"
              class="block text-sm font-medium leading-6 text-text"
              >{{ t('auth.action.confirmPassword') }}</label
            >
            <input
              id="confirm-password"
              v-model="confirmPassword"
              name="confirm-password"
              type="password"
              autocomplete="new-password"
              required
              class="mt-1 block w-full rounded-xs border-0 bg-surface py-1.5 text-text shadow-xs ring-1 ring-inset ring-border placeholder:text-text-secondary focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
            />
          </div>

          <div class="text-xs text-text-secondary">
            <p>{{ t('auth.passwordRequirements.title') }}</p>
            <ul class="mt-2 grid list-none grid-cols-1 gap-1 xs:grid-cols-2">
              <li
                v-for="requirement in requirements"
                :key="requirement.text"
                :class="requirement.valid ? 'text-hanafuda-green' : 'text-primary'"
              >
                {{ requirement.text }}
              </li>
            </ul>
          </div>

          <p
            v-if="formError"
            class="text-sm text-primary"
            role="alert"
          >
            {{ formError }}
          </p>

          <button
            type="submit"
            class="action-button w-full bg-border text-gray-900 dark:text-white"
            :disabled="status === 'submitting' || !passwordMeetsPolicy(password)"
          >
            {{ status === 'submitting' ? t('auth.action.saving') : t('auth.action.submit') }}
          </button>
        </form>

        <form
          v-else-if="showApplyButton"
          class="mt-6"
          @submit.prevent="handleSubmit"
        >
          <button
            type="submit"
            class="action-button w-full bg-border text-gray-900 dark:text-white"
            :disabled="status === 'submitting'"
          >
            {{ applyLabel }}
          </button>
        </form>

        <NuxtLink
          :to="nextPath"
          class="mt-6 block text-center text-sm text-text-secondary hover:text-primary hover:underline"
        >
          {{ t('auth.action.continue') }}
        </NuxtLink>
      </div>
    </div>
  </ContentLayout>
</template>

<script setup lang="ts">
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth'
import {
  actionToPerformOnLoad,
  actionToPerformOnSubmit,
  classifyAuthActionError,
  emailFromActionCodeInfo,
  parseAuthActionParams,
  passwordMeetsPolicy,
  passwordRequirementFlags,
  safeContinuePath,
  type AuthActionErrorKind,
} from '~/utils/authAction'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const auth = useFirebaseAuth()

const action = computed(() => parseAuthActionParams(route.query))

const pageTitle = computed(() => `${t('game.title')} | ${t('pages.resetPassword')}`)
useSeoMeta({
  title: pageTitle,
  robots: 'noindex',
})

type Status =
  | 'checking'
  | 'ready'
  | 'submitting'
  | 'success'
  | AuthActionErrorKind
  | 'missing'
  | 'unsupported'

const status = ref<Status>('checking')
const accountEmail = ref('')
const password = ref('')
const confirmPassword = ref('')
const formError = ref('')

const passwordFlags = computed(() => passwordRequirementFlags(password.value))
const requirements = computed(() => [
  { valid: passwordFlags.value.length, text: t('auth.passwordRequirements.sixCharacters') },
  { valid: passwordFlags.value.number, text: t('auth.passwordRequirements.oneNumber') },
  { valid: passwordFlags.value.upper, text: t('auth.passwordRequirements.oneUppercase') },
  { valid: passwordFlags.value.lower, text: t('auth.passwordRequirements.oneLowercase') },
  { valid: passwordFlags.value.special, text: t('auth.passwordRequirements.oneSpecialCharacter') },
])

const showPasswordForm = computed(
  () =>
    action.value.mode === 'resetPassword' &&
    (status.value === 'ready' || status.value === 'submitting'),
)
const showApplyButton = computed(
  () =>
    (action.value.mode === 'verifyEmail' || action.value.mode === 'recoverEmail') &&
    (status.value === 'ready' || status.value === 'submitting'),
)

const nextPath = computed(() => {
  const origin = import.meta.client ? window.location.origin : ''
  const fallback = localePath('/sign-in')
  if (!origin) return fallback
  return safeContinuePath(action.value.continueUrl, origin, fallback)
})

const heading = computed(() => {
  if (status.value === 'checking') return t('auth.action.verifying')
  if (status.value === 'success' && action.value.mode === 'verifyEmail')
    return t('auth.action.verifySuccessTitle')
  if (status.value === 'success' && action.value.mode === 'recoverEmail') {
    return t('auth.action.recoverSuccessTitle')
  }
  if (status.value === 'success') return t('auth.action.successTitle')
  if (status.value === 'expired') return t('auth.action.expiredTitle')
  if (status.value === 'missing') return t('auth.action.missingTitle')
  if (status.value === 'unsupported') return t('auth.action.unsupportedTitle')
  if (status.value === 'disabled') return t('auth.action.disabledTitle')
  if (status.value === 'network') return t('auth.action.networkTitle')
  if (status.value === 'generic') return t('auth.action.genericTitle')
  if (action.value.mode === 'verifyEmail') return t('auth.action.verifyTitle')
  if (action.value.mode === 'recoverEmail') return t('auth.action.recoverTitle')
  return t('auth.action.resetTitle')
})

const body = computed(() => {
  if (status.value === 'checking') return t('auth.action.verifyingBody')
  if (status.value === 'success' && action.value.mode === 'verifyEmail')
    return t('auth.action.verifySuccessBody')
  if (status.value === 'success' && action.value.mode === 'recoverEmail') {
    return t('auth.action.recoverSuccessBody')
  }
  if (status.value === 'success') return t('auth.action.successBody')
  if (status.value === 'expired') return t('auth.action.expiredBody')
  if (status.value === 'missing') return t('auth.action.missingBody')
  if (status.value === 'unsupported') return t('auth.action.unsupportedBody')
  if (status.value === 'disabled') return t('auth.action.disabledBody')
  if (status.value === 'network') return t('auth.action.network')
  if (status.value === 'generic') return t('auth.action.generic')
  if (action.value.mode === 'verifyEmail') {
    return t('auth.action.verifyBody', {
      email: accountEmail.value || t('auth.action.thisAddress'),
    })
  }
  if (action.value.mode === 'recoverEmail') {
    return t('auth.action.recoverBody', {
      email: accountEmail.value || t('auth.action.thisAddress'),
    })
  }
  return t('auth.action.resetDescription', {
    email: accountEmail.value || t('auth.action.thisAddress'),
  })
})

const applyLabel = computed(() => {
  if (status.value === 'submitting') return t('auth.action.saving')
  if (action.value.mode === 'recoverEmail') return t('auth.action.recoverButton')
  return t('auth.action.verifyButton')
})

function statusForError(kind: AuthActionErrorKind): Status {
  if (kind === 'weak-password') return 'ready'
  return kind
}

/**
 * Check the code without consuming it. confirmPasswordReset / applyActionCode
 * run only from handleSubmit.
 */
async function inspectLink() {
  const intent = actionToPerformOnLoad(action.value)
  if (intent.operation === 'none') {
    status.value = intent.reason === 'missing-code' ? 'missing' : 'unsupported'
    return
  }
  if (!auth) {
    status.value = 'generic'
    return
  }
  try {
    if (intent.operation === 'verifyPasswordResetCode') {
      accountEmail.value = await verifyPasswordResetCode(auth, intent.oobCode)
    } else {
      accountEmail.value = emailFromActionCodeInfo(await checkActionCode(auth, intent.oobCode))
    }
    status.value = 'ready'
  } catch (err) {
    status.value = statusForError(classifyAuthActionError(err))
  }
}

async function handleSubmit() {
  const submitOp = actionToPerformOnSubmit(action.value)
  if (!auth || !submitOp || status.value !== 'ready') return
  formError.value = ''

  if (submitOp === 'confirmPasswordReset') {
    if (!passwordMeetsPolicy(password.value)) {
      formError.value = t('auth.action.weakPassword')
      return
    }
    if (password.value !== confirmPassword.value) {
      formError.value = t('auth.action.mismatch')
      return
    }
  }

  status.value = 'submitting'
  try {
    if (submitOp === 'confirmPasswordReset') {
      await confirmPasswordReset(auth, action.value.oobCode, password.value)
      password.value = ''
      confirmPassword.value = ''
    } else {
      await applyActionCode(auth, action.value.oobCode)
    }
    status.value = 'success'
  } catch (err) {
    const kind = classifyAuthActionError(err)
    if (kind === 'weak-password') {
      status.value = 'ready'
      formError.value = t('auth.action.weakPassword')
      return
    }
    status.value = kind
  }
}

onMounted(inspectLink)
</script>
