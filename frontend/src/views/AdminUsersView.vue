<template>
  <div class="page-section">
    <p class="page-section-title">Users</p>

    <div class="admin-search-row">
      <input
        v-model="search"
        placeholder="Search by email…"
        @keyup.enter="fetchUsers(1)"
      />
      <button class="btn-sm" @click="fetchUsers(1)">Search</button>
    </div>

    <p v-if="loadError" class="form-error">{{ loadError }}</p>
    <div v-if="loading" class="spinner"></div>

    <div v-else-if="users.length === 0" class="page-section-subtitle">No users found.</div>

    <div v-else class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Verified</th>
            <th>Admin</th>
            <th>Status</th>
            <th>Created</th>
            <th>Sessions</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td class="text-mono">{{ u.email }}</td>
            <td><span class="badge" :class="u.isVerified ? 'yes' : 'no'">{{ u.isVerified ? "Yes" : "No" }}</span></td>
            <td><span class="badge" :class="u.isAdmin ? 'yes' : 'no'">{{ u.isAdmin ? "Yes" : "No" }}</span></td>
            <td>
              <span class="badge" :class="u.isLocked ? 'locked' : 'yes'">
                {{ u.isLocked ? "Locked" : "Active" }}
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
                {{ busy === u.id ? "…" : "Lock" }}
              </button>
              <button
                v-else
                class="btn-sm"
                :disabled="busy === u.id"
                @click="unlock(u)"
              >
                {{ busy === u.id ? "…" : "Unlock" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="pagination">
      <button class="btn-sm" :disabled="page === 1" @click="fetchUsers(page - 1)">‹ Prev</button>
      <span class="pagination-info">{{ page }} / {{ pages }}</span>
      <button class="btn-sm" :disabled="page === pages" @click="fetchUsers(page + 1)">Next ›</button>
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
    toast.show(`${u.email} locked`, "success")
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
    toast.show(`${u.email} unlocked`, "success")
  } catch (err: any) {
    toast.show(err.response?.data?.error ?? err.message, "error")
  } finally {
    busy.value = null
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" })
}
</script>
