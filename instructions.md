# Frontend Web App Development — Best Practices for Claude AI Assistant

> This document defines architecture rules, coding standards, and conventions for frontend web applications using **Vue 3**, **TypeScript**, and modern tooling. Claude should follow these instructions precisely when generating, reviewing, or modifying code.

---

## Table of Contents

1. [Project Architecture](#1-project-architecture)
2. [File & Folder Structure](#2-file--folder-structure)
3. [TypeScript Standards](#3-typescript-standards)
4. [Vue 3 Component Rules](#4-vue-3-component-rules)
5. [State Management](#5-state-management)
6. [Routing](#6-routing)
7. [API & Data Fetching](#7-api--data-fetching)
8. [Styling & CSS](#8-styling--css)
9. [Testing](#9-testing)
10. [Performance](#10-performance)
11. [Accessibility](#11-accessibility)
12. [Naming Conventions](#12-naming-conventions)
13. [Code Quality & Tooling](#13-code-quality--tooling)
14. [Claude-Specific Instructions](#14-claude-specific-instructions)

---

## 1. Project Architecture

### Core Stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API) |
| Language | TypeScript (strict mode) |
| Build Tool | Vite |
| State | Pinia |
| Router | Vue Router 4 |
| Styling | CSS Modules or Tailwind CSS |
| Testing | Vitest + Vue Testing Library |
| Linting | ESLint + Prettier |

### Architectural Principles

- **Feature-based structure**: Group files by domain/feature, not by file type.
- **Separation of concerns**: UI components do not contain business logic or API calls directly.
- **Composables for logic**: All reusable logic lives in composables (`use*.ts`).
- **Single source of truth**: Application state lives exclusively in Pinia stores.
- **Explicit over implicit**: Avoid magic — props, emits, and types must always be explicit.
- **No God components**: A component should do one thing well. Split early.

---

## 2. File & Folder Structure

```
src/
├── assets/               # Static assets (images, fonts, global CSS)
├── components/           # Globally shared, generic UI components
│   ├── base/             # Base/primitive components (BaseButton, BaseInput…)
│   └── layout/           # App layout components (AppHeader, AppSidebar…)
├── composables/          # Reusable Composition API logic
│   └── useAuth.ts
├── features/             # Feature modules (self-contained vertical slices)
│   └── users/
│       ├── components/   # Components used only within this feature
│       ├── composables/  # Feature-specific composables
│       ├── stores/       # Feature Pinia store
│       ├── types.ts      # Feature-specific TypeScript types
│       ├── api.ts        # Feature API calls
│       └── index.ts      # Public exports for the feature
├── layouts/              # Page layout wrappers (DefaultLayout, AuthLayout…)
├── pages/                # Route-level page components
├── router/               # Vue Router configuration
│   ├── index.ts
│   └── guards.ts
├── services/             # Shared service abstractions (http, storage…)
│   └── http.ts
├── stores/               # Global Pinia stores
├── types/                # Global TypeScript types and interfaces
│   ├── api.ts
│   └── index.ts
└── utils/                # Pure utility functions (no Vue dependencies)
```

### Rules

- One component per file.
- Page components live in `pages/` and are thin — they compose features, not implement them.
- Feature folders export only through `index.ts`.
- Never import from inside another feature's internal folders — use its `index.ts`.

---

## 3. TypeScript Standards

### Configuration

Always use `strict: true` in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Rules

**Always type everything explicitly. Never use `any`.**

```ts
// ✅ Good
function getUser(id: string): Promise<User> { ... }

// ❌ Bad
function getUser(id): Promise<any> { ... }
```

**Use `interface` for object shapes; `type` for unions, aliases, and mapped types.**

```ts
// ✅ Object shape
interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

// ✅ Union / alias
type UserRole = 'admin' | 'editor' | 'viewer'
type Nullable<T> = T | null
```

**Use `readonly` for data that should not be mutated.**

```ts
interface ApiResponse<T> {
  readonly data: T
  readonly status: number
  readonly message: string
}
```

**Prefer discriminated unions over boolean flags.**

```ts
// ✅ Good
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

// ❌ Bad
interface AsyncState<T> {
  isLoading: boolean
  isError: boolean
  data?: T
  error?: Error
}
```

**Never use non-null assertion (`!`) without a comment explaining why.**

```ts
// ✅ Acceptable with explanation
const el = document.getElementById('app')! // guaranteed by index.html
```

---

## 4. Vue 3 Component Rules

### Always use `<script setup lang="ts">`

```vue
<script setup lang="ts">
// All component logic lives here
</script>
```

### Define props and emits with `defineProps` / `defineEmits` using TypeScript

```ts
// ✅ Props
interface Props {
  userId: string
  isActive?: boolean
  variant?: 'primary' | 'secondary'
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  variant: 'primary',
})

// ✅ Emits
const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()
```

### Component structure order

Within `<script setup>`, always follow this order:

1. Imports
2. `defineProps` / `defineEmits`
3. Store references (`useXxxStore`)
4. Composable calls (`useXxx()`)
5. Local reactive state (`ref`, `reactive`, `computed`)
6. Lifecycle hooks (`onMounted`, etc.)
7. Methods / event handlers
8. `defineExpose` (only when necessary)

### Template rules

- Limit template logic — move complex expressions to `computed` properties.
- Always use `:key` on `v-for`. Use stable unique IDs, not array indices.
- Never use `v-if` and `v-for` on the same element. Use a `<template>` wrapper.
- Use `v-bind` shorthand (`:`) and `v-on` shorthand (`@`).

```vue
<!-- ✅ Good -->
<template v-for="user in activeUsers" :key="user.id">
  <UserCard v-if="user.isVisible" :user="user" />
</template>

<!-- ❌ Bad -->
<UserCard v-for="user in users" v-if="user.isVisible" :key="index" />
```

### Component naming

- Multi-word component names only (avoids conflict with HTML elements).
- PascalCase in `<script>` imports and `<template>`.
- Base/generic components: `Base` prefix (`BaseButton`, `BaseModal`).
- Layout components: `App` prefix (`AppHeader`, `AppSidebar`).
- Page components: `Page` suffix (`UsersPage`, `DashboardPage`).

### Keep components small

A component that exceeds ~200 lines of template + script is a signal to decompose it.

---

## 5. State Management

### Pinia — always use the Setup Store syntax

```ts
// stores/useUserStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])

  // Getters
  const isAuthenticated = computed(() => currentUser.value !== null)
  const adminUsers = computed(() => users.value.filter(u => u.role === 'admin'))

  // Actions
  async function fetchUsers(): Promise<void> {
    users.value = await userApi.getAll()
  }

  function setCurrentUser(user: User): void {
    currentUser.value = user
  }

  return { currentUser, users, isAuthenticated, adminUsers, fetchUsers, setCurrentUser }
})
```

### Store rules

- One store per feature domain.
- Stores contain only **serializable state**. No component refs.
- Actions handle async operations — components call actions, never call APIs directly.
- Do not mutate store state from components directly — always use actions.

---

## 6. Routing

### Route definitions with typed meta

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth: boolean
    title: string
    roles?: string[]
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/users',
    name: 'users',
    component: () => import('@/pages/UsersPage.vue'), // Always lazy-load pages
    meta: { requiresAuth: true, title: 'Users' },
  },
]
```

### Rules

- Always lazy-load page components with dynamic `import()`.
- Use named routes — never hardcode path strings in templates or components.
- Navigation guards live in `router/guards.ts`, not inside components.
- Use `<RouterLink>` with `:to="{ name: 'route-name' }"`, never hardcoded strings.

---

## 7. API & Data Fetching

### HTTP service abstraction

All HTTP calls go through a central service — never use `fetch` or `axios` directly in components or stores.

```ts
// services/http.ts
import axios from 'axios'
import type { AxiosInstance } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
})

// Attach interceptors for auth, error handling, etc.
export default http
```

### Feature API modules

```ts
// features/users/api.ts
import http from '@/services/http'
import type { User, CreateUserDto } from './types'

export const userApi = {
  getAll: (): Promise<User[]> =>
    http.get<User[]>('/users').then(r => r.data),

  getById: (id: string): Promise<User> =>
    http.get<User>(`/users/${id}`).then(r => r.data),

  create: (dto: CreateUserDto): Promise<User> =>
    http.post<User>('/users', dto).then(r => r.data),
}
```

### Rules

- All API functions are typed with explicit input and return types.
- Error handling is done in stores or composables — not in raw API files.
- Use environment variables (`import.meta.env.VITE_*`) for all base URLs and keys.
- Never expose API keys in frontend code.

---

## 8. Styling & CSS

### Approach: Scoped styles + CSS custom properties

```vue
<style scoped>
.user-card {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
}

.user-card__title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}
</style>
```

### Rules

- Always use `scoped` styles in components.
- Define design tokens as CSS custom properties in a global `:root` stylesheet.
- Use BEM naming for class names within component styles.
- No inline `style` attributes except for truly dynamic values (e.g., computed widths).
- Never use `!important`.
- Responsive design is mobile-first: base styles for mobile, `min-width` media queries for larger screens.
- If using Tailwind: utility classes in template, `@apply` only for reusable patterns in global CSS.

---

## 9. Testing

### Unit tests — Vitest + Vue Testing Library

```ts
// features/users/components/__tests__/UserCard.spec.ts
import { render, screen } from '@testing-library/vue'
import { describe, it, expect } from 'vitest'
import UserCard from '../UserCard.vue'

const mockUser = { id: '1', name: 'Alice', email: 'alice@example.com', role: 'editor' as const }

describe('UserCard', () => {
  it('renders the user name', () => {
    render(UserCard, { props: { user: mockUser } })
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows admin badge for admin role', () => {
    render(UserCard, { props: { user: { ...mockUser, role: 'admin' } } })
    expect(screen.getByRole('badge', { name: /admin/i })).toBeInTheDocument()
  })
})
```

### Rules

- Test behaviour, not implementation details.
- Mock external dependencies (API calls, stores) — not component internals.
- Component tests: use `@testing-library/vue`. Query by role, label, or text — never by class names.
- Store tests: test actions and getters in isolation using `createPinia()`.
- Coverage targets: composables and stores ≥ 90%, components ≥ 70%.

---

## 10. Performance

- Lazy-load all page-level components and heavy third-party libraries.
- Use `defineAsyncComponent` for large non-critical components.
- Use `v-memo` for expensive list renders where appropriate.
- Avoid watchers on large reactive objects — be precise with what you watch.
- Prefer `computed` over methods for derived state.
- Debounce or throttle event handlers on `input`, `scroll`, and `resize`.
- Use `shallowRef` / `shallowReactive` for large objects that don't need deep reactivity.

```ts
// ✅ Lazy-load heavy component
const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
```

---

## 11. Accessibility

- Every interactive element must be keyboard-accessible and focusable.
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`, `<header>`, `<section>`) before reaching for `<div>`.
- All images require meaningful `alt` text. Decorative images get `alt=""`.
- Form inputs must have an associated `<label>` (via `for`/`id` or `aria-label`).
- Modal dialogs must trap focus and return focus on close.
- Dynamic content updates must be announced via `aria-live` regions where appropriate.
- Colour contrast must meet WCAG AA (4.5:1 for text, 3:1 for UI components).

---

## 12. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase | `UserCard.vue` |
| Composable file | camelCase, `use` prefix | `useUserFilter.ts` |
| Store file | camelCase, `use` + `Store` suffix | `useUserStore.ts` |
| Page component | PascalCase, `Page` suffix | `UsersPage.vue` |
| Type / Interface | PascalCase | `UserRole`, `ApiResponse<T>` |
| Variable / function | camelCase | `activeUsers`, `fetchById` |
| CSS class (BEM) | kebab-case | `user-card__title--active` |
| CSS custom property | kebab-case, namespaced | `--color-text-primary` |
| Env variable | SCREAMING_SNAKE, `VITE_` prefix | `VITE_API_BASE_URL` |
| Boolean variable | `is` / `has` / `can` prefix | `isLoading`, `hasError` |

---

## 13. Code Quality & Tooling

### ESLint config (key rules)

```js
// eslint.config.js
export default [
  // vue/essential, @typescript-eslint/recommended as base
  {
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-macros-order': 'error',
      'vue/no-unused-vars': 'error',
    },
  },
]
```

### General rules

- Format with Prettier on save. No manual formatting debates.
- No commented-out code in commits. Use `// TODO:` or `// FIXME:` with a ticket reference when needed.
- No `console.log` in production code.
- Imports ordered: external libraries → internal aliases → relative paths.
- Use path aliases (`@/`) for all non-relative imports.

---

## 14. Claude-Specific Instructions

These rules govern how Claude should generate and respond to frontend code requests.

### When generating code

1. **Always infer the full type chain.** If generating a component that receives a `userId` prop, define the `User` type and the API response type, even if not explicitly asked.
2. **Default to `<script setup lang="ts">`** for every Vue component, without exception.
3. **Do not generate `any` types.** If the correct type is unknown from context, state the assumption and define a placeholder interface with a `// TODO: adjust to actual API shape` comment.
4. **Follow the folder structure.** When generating a new feature, produce files in the correct locations: `features/<name>/components/`, `features/<name>/stores/`, `features/<name>/api.ts`, `features/<name>/types.ts`.
5. **Generate the composable, not inline logic.** If a component needs async data fetching or complex state, extract it into a `use*.ts` composable automatically.
6. **Emit types must be exhaustive.** Always define the full emit signature, not `defineEmits(['update'])`.
7. **Include error and loading states.** Any async operation must include `AsyncState` handling — do not generate happy-path-only code.

### When reviewing or refactoring code

1. Flag every `any`, every missing return type, and every direct API call inside a component.
2. Suggest composable extraction when a component's `<script setup>` block exceeds ~60 lines of logic.
3. Point out missing `:key` on `v-for`, `v-if` + `v-for` on the same element, and direct store state mutation.

### When asked for architecture decisions

1. Recommend feature-based folder structure over type-based.
2. Recommend Pinia Setup Stores over Options Stores.
3. Recommend Vue Testing Library over direct component instance testing.
4. Always mention lazy-loading for route-level components.

### Code style Claude must follow

- No semicolons (Prettier default for Vue projects).
- Single quotes for strings.
- 2-space indentation.
- Trailing commas in multi-line structures.
- Arrow functions for callbacks; named `function` declarations for composables and store actions.

### What Claude must never generate

- `<Options API>` components (no `export default { data(), methods: {} }`).
- `this` keyword in Vue component logic.
- `any` types, `@ts-ignore`, or `@ts-nocheck`.
- Hardcoded API URLs or secrets.
- `console.log` without a comment that it's temporary.
- Direct DOM manipulation (`document.querySelector`) when a Vue ref can be used instead.
- Business logic or API calls placed directly inside page-level components.

---

*Keep this file updated as conventions evolve. When in doubt, prefer explicitness, type safety, and composability.*