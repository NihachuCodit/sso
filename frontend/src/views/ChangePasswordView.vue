<template>
  <div class="page-section" style="max-width: 480px">
    <p class="page-section-title">Смена пароля</p>
    <p class="page-section-subtitle">
      После смены пароля вы будете выведены со всех устройств.
    </p>

    <div v-if="success" class="success-msg">
      Пароль изменён. Войдите снова.
    </div>
    <p v-if="error" class="form-error">{{ error }}</p>

    <form v-if="!success" @submit.prevent="submit">
      <div class="form-field">
        <label for="current">Текущий пароль</label>
        <input
          id="current"
          v-model="currentPassword"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <div class="form-field">
        <label for="new">Новый пароль</label>
        <input
          id="new"
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
        <label for="confirm">Подтвердите пароль</label>
        <input
          id="confirm"
          v-model="confirm"
          type="password"
          autocomplete="new-password"
          placeholder="••••••••"
          required
          @blur="confirmTouched = true"
        />
        <p v-if="confirmTouched && confirm && newPassword !== confirm" class="field-hint">Пароли не совпадают</p>
      </div>

      <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem">
        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? "Сохранение…" : "Сменить пароль" }}
        </button>
        <RouterLink to="/profile" class="btn-ghost">Отмена</RouterLink>
      </div>
    </form>

    <div v-if="success" style="margin-top: 0.5rem">
      <RouterLink to="/login" class="btn" style="max-width: 160px" @click="auth.clear()">
        Войти снова
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { api } from "../api/client"
import { useAuthStore } from "../stores/auth"
import { passwordError } from "../utils/validation"

const auth = useAuthStore()

const currentPassword = ref("")
const newPassword     = ref("")
const confirm         = ref("")
const error           = ref("")
const loading         = ref(false)
const success         = ref(false)
const pwTouched       = ref(false)
const confirmTouched  = ref(false)

const pwError = computed(() => passwordError(newPassword.value))

async function submit() {
  pwTouched.value      = true
  confirmTouched.value = true
  if (pwError.value) return
  error.value = ""
  if (newPassword.value !== confirm.value) {
    error.value = "Пароли не совпадают"
    return
  }
  loading.value = true
  try {
    await api.post("/auth/change-password", {
      currentPassword: currentPassword.value,
      newPassword:     newPassword.value,
    })
    success.value = true
    // Clear client auth state — all sessions are revoked server-side
    auth.clear()
  } catch (err: any) {
    error.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}
</script>
