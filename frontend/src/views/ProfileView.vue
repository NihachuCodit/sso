<template>
  <div>
    <div class="page-section">
      <p class="page-section-title">Account</p>

      <div class="field-row">
        <span class="field-label">Email</span>
        <span class="field-value">{{ auth.user?.email }}</span>
      </div>
      <div class="field-row">
        <span class="field-label">User ID</span>
        <span class="field-value">{{ auth.user?.userId }}</span>
      </div>
    </div>

    <div class="page-section">
      <p class="page-section-title">Profile</p>

      <div v-if="!editingProfile">
        <div class="field-row">
          <span class="field-label">Display name</span>
          <span class="field-value">{{ auth.user?.displayName || "—" }}</span>
        </div>
        <button class="btn-ghost" style="margin-top: 1rem" @click="startEdit">
          Edit profile
        </button>
      </div>

      <form v-else @submit.prevent="saveProfile">
        <p v-if="profileError" class="form-error">{{ profileError }}</p>
        <div class="form-field">
          <label for="displayName">Display name</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="Your name"
            maxlength="64"
          />
        </div>
        <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem">
          <button class="btn" type="submit" :disabled="savingProfile" style="max-width: 120px">
            {{ savingProfile ? "Saving…" : "Save" }}
          </button>
          <button type="button" class="btn-ghost" @click="editingProfile = false">Cancel</button>
        </div>
      </form>
    </div>

    <div class="page-section">
      <p class="page-section-title">Security</p>
      <p class="page-section-subtitle">
        Changing your password will sign you out of all devices.
      </p>
      <RouterLink to="/change-password" class="btn" style="max-width: 200px; background: #3b82f6;">
        Change password
      </RouterLink>
    </div>

    <div class="page-section">
      <p class="page-section-title">Sessions</p>
      <p class="page-section-subtitle">
        Sign out of all devices, including this one.
      </p>
      <button class="btn" style="max-width: 200px; background: #ef4444" @click="handleLogoutAll" :disabled="loggingOut">
        {{ loggingOut ? "Signing out…" : "Sign out all devices" }}
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
    toast.show("Profile saved", "success")
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
