const API_URL = "http://localhost:3000"

export type User = { id: number; name: string; email: string }
export type Product = { id: number; name: string; description: string | null }
export type VoucherItem = {
  product_id: number
  product_name: string
  quantity: number
}
export type ActivationItem = {
  id: number
  product_id: number
  product_name: string
  activated_at: string
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Неизвестная ошибка"
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    })
  } catch {
    throw new ApiError("Не удалось подключиться к серверу", 0)
  }

  if (!res.ok) {
    let message = `Ошибка сервера (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error // текст, который отдал бэкенд
    } catch {
      // тело не JSON, оставляем общее сообщение
    }
    throw new ApiError(message, res.status)
  }
  return res.json()
}

export const api = {
  getUsers: () => request<User[]>("/users"),
  getProducts: () => request<Product[]>("/products"),
  getVouchers: (userId: number) =>
    request<VoucherItem[]>(`/users/${userId}/vouchers`),
  getActivations: (userId: number) =>
    request<ActivationItem[]>(`/users/${userId}/activations`),
  activate: (userId: number, productId: number) =>
    request<unknown>(`/users/${userId}/products/${productId}/activate`, {
      method: "POST",
    }),
  setVouchers: (userId: number, productId: number, quantity: number) =>
    request<VoucherItem>(
      `/admin/users/${userId}/products/${productId}/vouchers`,
      { method: "PUT", body: JSON.stringify({ quantity }) },
    ),
}