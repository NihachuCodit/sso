<template>
  <div class="app-shell">
    <nav class="app-nav">
      <span class="app-nav-brand">SSO-IDP</span>

      <div class="app-nav-links">
        <RouterLink to="/profile"  class="app-nav-link" activeClass="active">Профиль</RouterLink>
        <RouterLink to="/sessions" class="app-nav-link" activeClass="active">Сессии</RouterLink>
        <template v-if="auth.user?.isAdmin">
          <RouterLink to="/admin/users"      class="app-nav-link" activeClass="active">Пользователи</RouterLink>
          <RouterLink to="/admin/audit-logs" class="app-nav-link" activeClass="active">Журнал событий</RouterLink>
        </template>
      </div>

      <div class="app-nav-user">
        <span class="app-nav-email" :title="auth.user?.email">{{ auth.user?.email }}</span>
        <button class="btn-ghost" @click="handleLogout" :disabled="loggingOut">
          {{ loggingOut ? "…" : "Выйти" }}
        </button>
      </div>
    </nav>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"

const router     = useRouter()
const auth       = useAuthStore()
const loggingOut = ref(false)

async function handleLogout() {
  loggingOut.value = true
  await auth.logout()
  router.push("/login")
}
</script>
