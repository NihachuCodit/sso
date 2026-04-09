<template>
  <AuthCard
    title="Reset password"
    subtitle="Enter your email and we'll send you a code"
  >
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

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Sending…" : "Send code" }}
      </button>
    </form>

    <div class="form-links">
      <span><RouterLink to="/login">Back to sign in</RouterLink></span>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { api } from "../api/client"
import AuthCard from "../components/AuthCard.vue"

const router = useRouter()

const email   = ref("")
const error   = ref("")
const loading = ref(false)

async function submit() {
  error.value   = ""
  loading.value = true
  try {
    await api.post("/auth/otp", { email: email.value })
    router.push({ path: "/reset-password", state: { email: email.value } })
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}
</script>
