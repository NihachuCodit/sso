import { config } from "@vue/test-utils"

// Stub vue-router components globally so every test that mounts a component
// using <RouterLink> or <RouterView> in its template does not produce
// "Failed to resolve component" warnings.
config.global.stubs = {
  RouterLink: { template: "<a><slot /></a>" },
  RouterView: { template: "<div />" },
}
