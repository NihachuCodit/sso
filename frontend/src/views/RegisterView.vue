<template>
  <AuthCard title="Create account" subtitle="Start by verifying your email">
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
        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
          @blur="pwTouched = true"
        />
        <p v-if="pwTouched && pwError" class="field-hint">{{ pwError }}</p>
      </div>

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Creating account…" : "Create account" }}
      </button>
    </form>

    <div class="form-links">
      <span>Already have an account? <RouterLink to="/login">Sign in</RouterLink></span>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { api } from "../api/client"
import AuthCard from "../components/AuthCard.vue"
import { passwordError } from "../utils/validation"

const router = useRouter()

const email     = ref("")
const password  = ref("")
const error     = ref("")
const loading   = ref(false)
const pwTouched = ref(false)

const pwError = computed(() => passwordError(password.value))

async function submit() {
  pwTouched.value = true
  if (pwError.value) return
  error.value   = ""
  loading.value = true
  try {
    await api.post("/auth/register", { email: email.value, password: password.value })
    // Generate the OTP immediately so it's ready when the user reaches VerifyOtp
    await api.post("/auth/otp", { email: email.value })
    router.push({ path: "/verify-otp", state: { email: email.value } })
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}
</script>
