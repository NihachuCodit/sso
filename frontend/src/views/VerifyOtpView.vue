<template>
  <AuthCard
    title="Проверьте почту"
    :subtitle="email ? `Мы отправили код на ${email}` : 'Введите код из письма'"
  >
    <p v-if="error" class="form-error">{{ error }}</p>

    <form @submit.prevent="submit">
      <div class="form-field">
        <label for="otp">6-значный код</label>
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
        {{ loading ? "Проверка…" : "Подтвердить" }}
      </button>
    </form>

    <div class="form-links">
      <span>
        Не получили код?
        <a v-if="cooldown === 0" href="#" @click.prevent="resend">Отправить повторно</a>
        <span v-else class="resend-cooldown">Повтор через {{ cooldown }}с</span>
      </span>
      <span><RouterLink to="/login">Назад ко входу</RouterLink></span>
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

onMounted(() => {
  if (!email.value) {
    router.replace("/login")
    return
  }
  startCooldown()
})
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
    toast.show("Код отправлен повторно", "success")
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  }
}
</script>
