import type { NavigationGuardWithThis } from "vue-router"
import { useAuthStore } from "../stores/auth"

export const navigationGuard: NavigationGuardWithThis<undefined> = async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (!to.meta.public && !auth.isLoggedIn) {
    return { path: "/login", query: { redirect: to.fullPath } }
  }

  if (to.meta.public && auth.isLoggedIn) {
    return { path: "/profile" }
  }
}
