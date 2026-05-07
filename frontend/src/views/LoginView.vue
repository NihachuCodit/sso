<template>
  <AuthCard title="Войти" subtitle="С возвращением!">
    <p v-if="error" class="form-error">{{ error }}</p>

    <form @submit.prevent="submit">
      <div class="form-field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div class="form-field">
        <label for="password">Пароль</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Вход…" : "Войти" }}
      </button>
    </form>

    <div class="form-links">
      <span>
        <RouterLink to="/forgot-password">Забыли пароль?</RouterLink>
      </span>
      <span>
        Нет аккаунта? <RouterLink to="/register">Зарегистрироваться</RouterLink>
      </span>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter, useRoute } from "vue-router"
import { useAuthStore } from "../stores/auth"
import AuthCard from "../components/AuthCard.vue"

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const email    = ref("")
const password = ref("")
const error    = ref("")
const loading  = ref(false)

async function submit() {
  error.value   = ""
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/profile"
    router.push(redirect)
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}
</script>
