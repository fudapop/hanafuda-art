// middleware/auth.ts
const { getProfile } = useProfile()

export default defineNuxtRouteMiddleware(async (to, from) => {
  const localeRoute = useLocaleRoute()
  const user = await getCurrentUser()
  if (user) {
    await getProfile(user)
  } else {
    return navigateTo(localeRoute('/sign-in'))
  }
})
