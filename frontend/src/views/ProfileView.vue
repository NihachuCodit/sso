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

    <!-- Profile editing — UI ready, wired to backend later -->
    <div class="page-section">
      <p class="page-section-title">Profile</p>

      <div v-if="!editingProfile">
        <div class="field-row">
          <span class="field-label">Display name</span>
          <span class="field-value">{{ displayName || "—" }}</span>
        </div>
        <button class="btn-ghost" style="margin-top: 1rem" @click="editingProfile = true">
          Edit profile
        </button>
      </div>

      <form v-else @submit.prevent="saveProfile">
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
          <button class="btn" type="submit" style="max-width: 120px">Save</button>
          <button type="button" class="btn-ghost" @click="editingProfile = false">Cancel</button>
        </div>
      </form>
    </div>

    <div class="page-section">
      <p class="page-section-title">Security</p>
      <p class="page-section-subtitle">
        Changing your password will sign you out of all devices.
      </p>
      <RouterLink to="/change-password" class="btn" style="max-width: 200px">
        Change password
      </RouterLink>
    </div>

    <div class="page-section">
      <p class="page-section-title">Sessions</p>
      <p class="page-section-subtitle">
        Sign out of all devices, including this one.
      </p>
      <button class="btn" style="max-width: 200px; background: var(--error)" @click="handleLogoutAll" :disabled="loggingOut">
        {{ loggingOut ? "Signing out…" : "Sign out all devices" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"
import { useToast } from "../composables/useToast"

const router         = useRouter()
const auth           = useAuthStore()
const toast          = useToast()
const loggingOut     = ref(false)
const editingProfile = ref(false)
const displayName    = ref("")

async function handleLogoutAll() {
  loggingOut.value = true
  await auth.logoutAll()
  router.push("/login")
}

function saveProfile() {
  // TODO: wire up to PATCH /auth/profile once backend endpoint is ready
  editingProfile.value = false
  toast.show("Profile saved", "success")
}
</script>
