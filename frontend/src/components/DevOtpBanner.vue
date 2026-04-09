<template>
  <div v-if="isDev" class="dev-banner">
    <strong>Dev mode</strong> — no email is sent. Fetch your OTP from the API:
    <code>GET {{ apiUrl }}/dev/otp?email={{ email }}</code>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ email: string }>()

const isDev   = import.meta.env.DEV
const apiUrl  = import.meta.env.VITE_API_URL ?? "http://localhost:3000"
// Keep the banner reactive to email prop changes
const email   = props.email
</script>
