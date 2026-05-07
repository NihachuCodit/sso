<template>
  <div class="page-section">
    <p class="page-section-title">Пользователи</p>

    <div class="admin-search-row">
      <input
        v-model="search"
        placeholder="Поиск по email…"
        @keyup.enter="fetchUsers(1)"
      />
      <button class="btn-sm" @click="fetchUsers(1)">Найти</button>
    </div>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>
    <div v-if="loading" class="spinner"></div>

    <div v-else-if="users.length === 0" class="page-section-subtitle">Пользователи не найдены.</div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Подтверждён</th>
            <th>Администратор</th>
            <th>Статус</th>
            <th>Создан</th>
            <th>Сессии</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="text-mono">{{ u.email }}</td>
            <td><span class="badge" :class="u.isVerified ? 'yes' : 'no'">{{ u.isVerified ? "Да" : "Нет" }}</span></td>
            <td><span class="badge" :class="u.isAdmin ? 'yes' : 'no'">{{ u.isAdmin ? "Да" : "Нет" }}</span></td>
            <td>
              <span class="badge" :class="u.isLocked ? 'locked' : 'yes'">
                {{ u.isLocked ? "Заблокирован" : "Активен" }}
              </span>
            </td>
            <td>{{ formatDate(u.createdAt) }}</td>
            <td>{{ u._count.sessions }}</td>
            <td>
              <button
                v-if="!u.isLocked"
                class="btn-sm danger"
                :disabled="busy === u.id"
                @click="lock(u)"
              >
                {{ busy === u.id ? "…" : "Заблокировать" }}
              </button>
              <button
                v-else
                class="btn-sm"
                :disabled="busy === u.id"
                @click="unlock(u)"
              >
                {{ busy === u.id ? "…" : "Разблокировать" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="pagination">
      <button class="btn-sm" :disabled="page === 1" @click="fetchUsers(page - 1)">‹ Назад</button>
      <span class="pagination-info">{{ page }} / {{ pages }}</span>
      <button class="btn-sm" :disabled="page === pages" @click="fetchUsers(page + 1)">Вперёд ›</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { api } from "../api/client"
import { useToast } from "../composables/useToast"

interface AdminUser {
  id:         string
  email:      string
  isVerified: boolean
  isAdmin:    boolean
  isLocked:   boolean
  createdAt:  string
  _count:     { sessions: number }
}

const LIMIT = 20

const users     = ref<AdminUser[]>([])
const loading   = ref(true)
const loadError = ref("")
const busy      = ref<string | null>(null)
const page      = ref(1)
const pages     = ref(1)
const search    = ref("")
const toast     = useToast()

async function fetchUsers(toPage = 1) {
  loading.value   = true
  loadError.value = ""
  page.value      = toPage
  try {
    const q = new URLSearchParams({ limit: String(LIMIT), page: String(toPage) })
    if (search.value.trim()) q.set("search", search.value.trim())
    const { data } = await api.get<{ users: AdminUser[]; pages: number }>(`/admin/users?${q}`)
    users.value = data.users
    pages.value = data.pages
  } catch (err: any) {
    loadError.value = err.response?.data?.error ?? err.message
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchUsers(1))

async function lock(u: AdminUser) {
  busy.value = u.id
  try {
    await api.post(`/admin/users/${u.id}/lock`)
    u.isLocked = true
    toast.show(`${u.email} заблокирован`, "success")
  } catch (err: any) {
    toast.show(err.response?.data?.error ?? err.message, "error")
  } finally {
    busy.value = null
  }
}

async function unlock(u: AdminUser) {
  busy.value = u.id
  try {
    await api.post(`/admin/users/${u.id}/unlock`)
    u.isLocked = false
    toast.show(`${u.email} разблокирован`, "success")
  } catch (err: any) {
    toast.show(err.response?.data?.error ?? err.message, "error")
  } finally {
    busy.value = null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { dateStyle: "medium" })
}
</script>
