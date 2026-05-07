<template>
  <div class="page-section">
    <p class="page-section-title">Журнал событий</p>

    <div class="admin-search-row">
      <input
        v-model="filterUserId"
        placeholder="Фильтр по ID пользователя…"
        style="max-width: 240px"
        @keyup.enter="fetchLogs(1)"
      />
      <input
        v-model="filterType"
        placeholder="Фильтр по типу события…"
        style="max-width: 220px"
        @keyup.enter="fetchLogs(1)"
      />
      <button class="btn-sm" @click="fetchLogs(1)">Фильтр</button>
    </div>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>
    <div v-if="loading" class="spinner"></div>

    <div v-else-if="logs.length === 0" class="page-section-subtitle">Записи не найдены.</div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Время</th>
            <th>Событие</th>
            <th>ID пользователя</th>
            <th>IP</th>
            <th>Результат</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id">
            <td style="white-space: nowrap">{{ formatDate(l.createdAt) }}</td>
            <td class="text-mono">{{ l.eventType }}</td>
            <td class="text-mono">{{ l.userId ?? "—" }}</td>
            <td class="text-mono">{{ l.ip ?? "—" }}</td>
            <td>
              <span class="badge" :class="l.success ? 'yes' : 'locked'">
                {{ l.success ? "OK" : "Ошибка" }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="pagination">
      <button class="btn-sm" :disabled="page === 1" @click="fetchLogs(page - 1)">‹ Назад</button>
      <span class="pagination-info">{{ page }} / {{ pages }}</span>
      <button class="btn-sm" :disabled="page === pages" @click="fetchLogs(page + 1)">Вперёд ›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { api } from "../api/client"

interface AuditLog {
  id:        string
  eventType: string
  userId:    string | null
  ip:        string | null
  success:   boolean
  createdAt: string
}

const LIMIT = 50

const logs         = ref<AuditLog[]>([])
const loading      = ref(true)
const loadError    = ref("")
const page         = ref(1)
const pages        = ref(1)
const filterUserId = ref("")
const filterType   = ref("")

async function fetchLogs(toPage = 1) {
  loading.value   = true
  loadError.value = ""
  page.value      = toPage
  try {
    const q = new URLSearchParams({ limit: String(LIMIT), page: String(toPage) })
    if (filterUserId.value.trim()) q.set("userId", filterUserId.value.trim())
    if (filterType.value.trim())   q.set("type",   filterType.value.trim())
    const { data } = await api.get<{ logs: AuditLog[]; pages: number }>(`/admin/audit-logs?${q}`)
    logs.value  = data.logs
    pages.value = data.pages
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchLogs(1))

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })
}
</script>
