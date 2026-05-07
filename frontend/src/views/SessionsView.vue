<template>
  <div class="page-section">
    <p class="page-section-title">Активные сессии</p>

    <!-- Filters -->
    <div class="sessions-toolbar">
      <div class="filter-group">
        <label class="filter-label">Статус</label>
        <select v-model="statusFilter" class="filter-select" @change="fetchSessions(1)">
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="revoked">Отозванные</option>
        </select>
      </div>
    </div>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>

    <div v-if="loading" class="spinner"></div>

    <div v-else-if="sessions.length === 0" class="page-section-subtitle">
      Сессии не найдены.
    </div>

    <ul v-else style="list-style: none">
      <li v-for="s in sessions" :key="s.id" class="session-item">
        <div class="session-info">
          <div class="session-device">{{ deviceLabel(s.deviceInfo) }}</div>
          <div class="session-meta">
            <span v-if="s.lastUsedAt">Последнее использование {{ formatDate(s.lastUsedAt) }}</span>
            <span>Создана {{ formatDate(s.createdAt) }}</span>
            <span class="session-badge" :class="s.revoked ? 'revoked' : 'active'">
              {{ s.revoked ? "Отозвана" : "Активна" }}
            </span>
          </div>
        </div>

        <button
          v-if="!s.revoked"
          class="btn-sm danger"
          :disabled="revoking === s.id"
          @click="revoke(s.id)"
        >
          {{ revoking === s.id ? "…" : "Отозвать" }}
        </button>
      </li>
    </ul>

    <!-- Pagination -->
    <div v-if="pages > 1" class="pagination">
      <button
        class="btn-sm"
        :disabled="page === 1"
        @click="fetchSessions(page - 1)"
      >
        ‹ Назад
      </button>

      <span class="pagination-info">{{ page }} / {{ pages }}</span>

      <button
        class="btn-sm"
        :disabled="page === pages"
        @click="fetchSessions(page + 1)"
      >
        Вперёд ›
      </button>
    </div>
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

const LIMIT = 20

const sessions    = ref<Session[]>([])
const loading     = ref(true)
const loadError   = ref("")
const revoking    = ref<string | null>(null)
const page        = ref(1)
const pages       = ref(1)
const statusFilter = ref<"all" | "active" | "revoked">("all")
const toast       = useToast()

async function fetchSessions(toPage = 1) {
  loading.value   = true
  loadError.value = ""
  page.value      = toPage
  try {
    const { data } = await api.get<{ sessions: Session[]; pages: number }>(
      `/sessions?status=${statusFilter.value}&limit=${LIMIT}&page=${toPage}`,
    )
    sessions.value = data.sessions
    pages.value    = data.pages
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchSessions(1))

async function revoke(id: string) {
  revoking.value = id
  try {
    await api.delete(`/sessions/${id}`)
    const s = sessions.value.find(s => s.id === id)
    if (s) s.revoked = true
    toast.show("Сессия отозвана", "success")
    // If filtered to active-only, remove the now-revoked entry
    if (statusFilter.value === "active")
      sessions.value = sessions.value.filter(s => s.id !== id)
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    revoking.value = null
  }
}

function deviceLabel(raw: string | null): string {
  if (!raw) return "Неизвестное устройство"
  try {
    const parsed = JSON.parse(raw)
    return parsed.userAgent ?? parsed.device ?? raw
  } catch {
    return raw
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}
</script>
