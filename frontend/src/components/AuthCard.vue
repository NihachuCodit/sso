<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <h1 class="auth-title">{{ title }}</h1>
      <p v-if="subtitle" class="auth-subtitle">{{ subtitle }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>
