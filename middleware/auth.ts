// middleware/auth.ts
import { useProfile } from "~/composables/useProfile";

const { getProfile } = useProfile();

export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = await getCurrentUser();
  // redirect the user to the login page
  if (user) {
    const profile = await getProfile(user)
    to.params.user = JSON.stringify(profile);
  } else {
    return navigateTo({
      path: "/login",
      query: {
        redirect: to.fullPath,
      },
    });
  }
});
