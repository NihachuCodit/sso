<template>
  <AuthCard
    title="Set new password"
    :subtitle="email ? `Enter the code sent to ${email}` : 'Enter your code and a new password'"
  >
    <DevOtpBanner :email="email" />

    <p v-if="error" class="form-error">{{ error }}</p>

    <form @submit.prevent="submit">
      <div class="form-field">
        <label for="otp">6-digit code</label>
        <input
          id="otp"
          v-model="otp"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="123456"
          maxlength="6"
          required
        />
      </div>

      <div class="form-field">
        <label for="password">New password</label>
        <input
          id="password"
          v-model="newPassword"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
          @blur="pwTouched = true"
        />
        <p v-if="pwTouched && pwError" class="field-hint">{{ pwError }}</p>
      </div>

      <div class="form-field">
        <label for="confirm">Confirm new password</label>
        <input
          id="confirm"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
          @blur="confirmTouched = true"
        />
        <p v-if="confirmTouched && confirm && newPassword !== confirm" class="field-hint">Passwords do not match</p>
      </div>

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Resetting…" : "Reset password" }}
      </button>
    </form>

    <div class="form-links">
      <span><RouterLink to="/login">Back to sign in</RouterLink></span>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { api } from "../api/client"
import AuthCard from "../components/AuthCard.vue"
import DevOtpBanner from "../components/DevOtpBanner.vue"
import { passwordError } from "../utils/validation"

const router = useRouter()

const email          = ref<string>(history.state?.email ?? "")
const otp            = ref("")
const newPassword    = ref("")
const confirm        = ref("")
const error          = ref("")
const loading        = ref(false)
const pwTouched      = ref(false)
const confirmTouched = ref(false)

const pwError = computed(() => passwordError(newPassword.value))

async function submit() {
  pwTouched.value      = true
  confirmTouched.value = true
  if (pwError.value) return
  error.value = ""
  if (newPassword.value !== confirm.value) {
    error.value = "Passwords do not match"
    return
  }
  loading.value = true
  try {
    await api.post("/auth/reset-password", {
      email:       email.value,
      otp:         otp.value,
      newPassword: newPassword.value,
    })
    router.push("/login")
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}
</script>
