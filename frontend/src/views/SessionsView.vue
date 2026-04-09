<template>
  <div class="page-section">
    <p class="page-section-title">Active sessions</p>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>

    <div v-if="loading" class="spinner"></div>

    <div v-else-if="sessions.length === 0" class="page-section-subtitle">
      No sessions found.
    </div>

    <ul v-else style="list-style: none">
      <li v-for="s in sessions" :key="s.id" class="session-item">
        <div class="session-info">
          <div class="session-device">{{ deviceLabel(s.deviceInfo) }}</div>
          <div class="session-meta">
            <span v-if="s.lastUsedAt">Last used {{ formatDate(s.lastUsedAt) }}</span>
            <span>Created {{ formatDate(s.createdAt) }}</span>
            <span class="session-badge" :class="s.revoked ? 'revoked' : 'active'">
              {{ s.revoked ? "Revoked" : "Active" }}
            </span>
          </div>
        </div>

        <button
          v-if="!s.revoked"
          class="btn-sm danger"
          :disabled="revoking === s.id"
          @click="revoke(s.id)"
        >
          {{ revoking === s.id ? "…" : "Revoke" }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { api } from "../api/client"
import { useToast } from "../composables/useToast"

interface Session {
  id:             string
  familyId:       string
  refreshCounter: number
  deviceInfo:     string | null
  revoked:        boolean
  lastUsedAt:     string | null
  createdAt:      string
}

const sessions  = ref<Session[]>([])
const loading   = ref(true)
const loadError = ref("")
const revoking  = ref<string | null>(null)
const toast     = useToast()

onMounted(async () => {
  try {
    const { data } = await api.get<{ sessions: Session[] }>("/sessions")
    sessions.value = data.sessions
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
})

async function revoke(id: string) {
  revoking.value = id
  try {
    await api.delete(`/sessions/${id}`)
    const s = sessions.value.find(s => s.id === id)
    if (s) s.revoked = true
    toast.show("Session revoked", "success")
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    revoking.value = null
  }
}

function deviceLabel(raw: string | null): string {
  if (!raw) return "Unknown device"
  try {
    const parsed = JSON.parse(raw)
    return parsed.userAgent ?? parsed.device ?? raw
  } catch {
    return raw
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
</script>
