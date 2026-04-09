<template>
  <AuthCard
    title="Check your email"
    :subtitle="email ? `We sent a code to ${email}` : 'Enter the code from your email'"
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

      <button class="btn" type="submit" :disabled="loading">
        {{ loading ? "Verifying…" : "Verify" }}
      </button>
    </form>

    <div class="form-links">
      <span>
        Didn't receive it?
        <a v-if="cooldown === 0" href="#" @click.prevent="resend">Resend code</a>
        <span v-else class="resend-cooldown">Resend in {{ cooldown }}s</span>
      </span>
      <span><RouterLink to="/login">Back to sign in</RouterLink></span>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { api } from "../api/client"
import { useAuthStore } from "../stores/auth"
import { useToast } from "../composables/useToast"
import AuthCard from "../components/AuthCard.vue"
import DevOtpBanner from "../components/DevOtpBanner.vue"

const router = useRouter()
const auth   = useAuthStore()
const toast  = useToast()

// Email is passed via history state from RegisterView or ForgotPasswordView
const email    = ref<string>(history.state?.email ?? "")
const otp      = ref("")
const error    = ref("")
const loading  = ref(false)
const cooldown = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 30
  timer = setInterval(() => {
    if (--cooldown.value <= 0 && timer) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onMounted(() => startCooldown())
onUnmounted(() => { if (timer) clearInterval(timer) })

async function submit() {
  error.value   = ""
  loading.value = true
  try {
    const { data } = await api.post<{ accessToken: string }>(
      "/auth/verify-otp",
      { email: email.value, otp: otp.value },
    )
    await auth.loginWithTokens(data.accessToken)
    router.push("/profile")
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}

async function resend() {
  error.value = ""
  try {
    await api.post("/auth/otp", { email: email.value })
    startCooldown()
    toast.show("Code resent", "success")
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  }
}
</script>
