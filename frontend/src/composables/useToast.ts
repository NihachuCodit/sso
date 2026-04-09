import { ref } from "vue"

export type ToastType = "success" | "error" | "info"

interface Toast {
  id:      number
  message: string
  type:    ToastType
}

const toasts = ref<Toast[]>([])
let _id = 0

export function useToast() {
  function show(message: string, type: ToastType = "info", duration = 3500) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    setTimeout(() => dismiss(id), duration)
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, dismiss }
}
