import { createRouter, createWebHistory } from "vue-router"
import { navigationGuard } from "./guard"

declare module "vue-router" {
  interface RouteMeta {
    public?: boolean
    admin?:  boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ── Public ──────────────────────────────────────────────────────────────
    { path: "/login",           component: () => import("../views/LoginView.vue"),          meta: { public: true } },
    { path: "/register",        component: () => import("../views/RegisterView.vue"),       meta: { public: true } },
    { path: "/verify-otp",      component: () => import("../views/VerifyOtpView.vue"),      meta: { public: true } },
    { path: "/forgot-password", component: () => import("../views/ForgotPasswordView.vue"), meta: { public: true } },
    { path: "/reset-password",  component: () => import("../views/ResetPasswordView.vue"),  meta: { public: true } },

    // ── Protected — rendered inside AppLayout shell ──────────────────────────
    {
      path:      "/",
      component: () => import("../layouts/AppLayout.vue"),
      children:  [
        { path: "",               redirect: "/profile" },
        { path: "profile",        component: () => import("../views/ProfileView.vue") },
        { path: "change-password",component: () => import("../views/ChangePasswordView.vue") },
        { path: "sessions",       component: () => import("../views/SessionsView.vue") },

        // ── Admin ──────────────────────────────────────────────────────────
        { path: "admin/users",      component: () => import("../views/AdminUsersView.vue"),     meta: { admin: true } },
        { path: "admin/audit-logs", component: () => import("../views/AdminAuditLogsView.vue"), meta: { admin: true } },
      ],
    },
  ],
})

router.beforeEach(navigationGuard)

export default router
