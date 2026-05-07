<template>
  <div>
    <div class="page-section">
      <p class="page-section-title">Аккаунт</p>

      <div class="field-row">
        <span class="field-label">Email</span>
        <span class="field-value">{{ auth.user?.email }}</span>
      </div>
      <div class="field-row">
        <span class="field-label">ID пользователя</span>
        <span class="field-value">{{ auth.user?.userId }}</span>
      </div>
    </div>

    <div class="page-section">
      <p class="page-section-title">Профиль</p>

      <div v-if="!editingProfile">
        <div class="field-row">
          <span class="field-label">Отображаемое имя</span>
          <span class="field-value">{{ auth.user?.displayName || "—" }}</span>
        </div>
        <button class="btn-ghost" style="margin-top: 1rem" @click="startEdit">
          Редактировать
        </button>
      </div>

      <form v-else @submit.prevent="saveProfile">
        <p v-if="profileError" class="form-error">{{ profileError }}</p>
        <div class="form-field">
          <label for="displayName">Отображаемое имя</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Ваше имя"
            maxlength="64"
          />
        </div>
        <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem">
          <button class="btn" type="submit" :disabled="savingProfile" style="max-width: 120px">
            {{ savingProfile ? "Сохранение…" : "Сохранить" }}
          </button>
          <button type="button" class="btn-ghost" @click="editingProfile = false">Отмена</button>
        </div>
      </form>
    </div>

    <div class="page-section">
      <p class="page-section-title">Безопасность</p>
      <p class="page-section-subtitle">
        Смена пароля выполнит выход на всех устройствах.
      </p>
      <RouterLink to="/change-password" class="btn" style="max-width: 200px; background: #3b82f6;">
        Сменить пароль
      </RouterLink>
    </div>

    <div class="page-section">
      <p class="page-section-title">Сессии</p>
      <p class="page-section-subtitle">
        Выйти со всех устройств, включая текущее.
      </p>
      <button class="btn" style="max-width: 200px; background: #ef4444" @click="handleLogoutAll" :disabled="loggingOut">
        {{ loggingOut ? "Выход…" : "Выйти со всех устройств" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { api } from "../api/client"
import { useAuthStore } from "../stores/auth"
import { useToast } from "../composables/useToast"

const router         = useRouter()
const auth           = useAuthStore()
const toast          = useToast()
const loggingOut     = ref(false)
const editingProfile = ref(false)
const savingProfile  = ref(false)
const profileError   = ref("")
const displayName    = ref("")

function startEdit() {
  displayName.value    = auth.user?.displayName ?? ""
  profileError.value   = ""
  editingProfile.value = true
}

async function saveProfile() {
  profileError.value  = ""
  savingProfile.value = true
  try {
    await api.patch("/auth/profile", { displayName: displayName.value })
    // Sync the store so the new name is visible immediately
    await auth.fetchProfile()
    editingProfile.value = false
    toast.show("Профиль сохранён", "success")
  } catch (err: any) {
    profileError.value = err.response?.data?.error ?? err.message
  } finally {
    savingProfile.value = false
  }
}

async function handleLogoutAll() {
  loggingOut.value = true
  await auth.logoutAll()
  router.push("/login")
}
</script>
