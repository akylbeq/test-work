import { useEffect, useState } from "react"
import { api, errorMessage, type Product, type User } from "@/api"
import { AdminForm } from "@/components/AdminForm"
import { ErrorAlert, LoadingRows } from "@/components/Feedback"
import { HistoryCard } from "@/components/HistoryCard"
import { VouchersCard } from "@/components/VouchersCard"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function App() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [userId, setUserId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Первичная загрузка: пользователи и продукты
  useEffect(() => {
    Promise.all([api.getUsers(), api.getProducts()])
      .then(([u, p]) => {
        setUsers(u)
        setProducts(p)
        if (u.length > 0) setUserId(u[0].id)
      })
      .catch((e) => setError(errorMessage(e)))
  }, [])

  const refresh = () => setRefreshKey((k) => k + 1)
  const selectedUser = users?.find((u) => u.id === userId)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Ваучеры</h1>

      <Card>
        <CardHeader>
          <CardTitle>Пользователь</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <ErrorAlert title="Не удалось загрузить данные" message={error} />
          ) : users === null ? (
            <LoadingRows rows={1} />
          ) : (
            <Select
              value={userId !== null ? String(userId) : ""}
              onValueChange={(v) => setUserId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <>
          <VouchersCard
            key={`v-${selectedUser.id}`}
            userId={selectedUser.id}
            refreshKey={refreshKey}
            onChanged={refresh}
          />
          <HistoryCard
            key={`h-${selectedUser.id}`}
            userId={selectedUser.id}
            refreshKey={refreshKey}
          />
          <AdminForm
            key={`a-${selectedUser.id}`}
            userId={selectedUser.id}
            userName={selectedUser.name}
            products={products}
            onChanged={refresh}
          />
        </>
      )}
    </div>
  )
}