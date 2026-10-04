import { useState, type FormEvent } from "react"
import { api, errorMessage, type Product } from "@/api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ErrorAlert } from "./Feedback"

type Props = {
  userId: number
  userName: string
  products: Product[]
  onChanged: () => void
}

export function AdminForm({ userId, userName, products, onChanged }: Props) {
  const [productId, setProductId] = useState<string>("")
  const [quantity, setQuantity] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const n = Number(quantity)
    if (!productId) {
      setError("Выберите продукт")
      return
    }
    if (quantity.trim() === "" || !Number.isInteger(n) || n < 0) {
      setError("Количество должно быть целым числом не меньше 0")
      return
    }

    setSubmitting(true)
    try {
      const item = await api.setVouchers(userId, Number(productId), n)
      setSuccess(`Готово: «${item.product_name}», запас теперь ${item.quantity}`)
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Администратор: задать запас</CardTitle>
        <CardDescription>
          Пользователь: <b>{userName}</b>. Новое значение заменяет текущий
          запас.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Продукт</Label>
<Select
  value={productId}
  onValueChange={(v) => setProductId(v ?? "")}
  items={products.map((p) => ({ value: String(p.id), label: p.name }))}
>
  <SelectTrigger>
    <SelectValue placeholder="Выберите продукт" />
  </SelectTrigger>
  <SelectContent>
    {products.map((p) => (
      <SelectItem key={p.id} value={String(p.id)}>
        {p.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Количество ваучеров</Label>
            <Input
              id="quantity"
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Например, 5"
            />
          </div>

          {error && <ErrorAlert message={error} />}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Сохранение…" : "Сохранить"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}