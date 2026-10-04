import { useEffect, useState } from "react"
import { api, errorMessage, type VoucherItem } from "@/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorAlert, LoadingRows } from "./Feedback"

type Props = {
  userId: number
  refreshKey: number
  onChanged: () => void
}

export function VouchersCard({ userId, refreshKey, onChanged }: Props) {
  const [items, setItems] = useState<VoucherItem[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<number | null>(null)

  // Загрузка запаса. Перезапускается при смене refreshKey (после любого изменения)
  useEffect(() => {
    let cancelled = false
    api
      .getVouchers(userId)
      .then((data) => {
        if (!cancelled) {
          setItems(data)
          setLoadError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setLoadError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  async function handleActivate(productId: number) {
    setPendingId(productId)
    setActionError(null)
    try {
      await api.activate(userId, productId)
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setPendingId(null)
      onChanged() // перечитать запас и историю в любом случае
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Запас ваучеров</CardTitle>
        <CardDescription>Активация уменьшает запас на один.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError && (
          <ErrorAlert title="Не удалось активировать" message={actionError} />
        )}

        {loadError ? (
          <ErrorAlert message={loadError} />
        ) : items === null ? (
          <LoadingRows />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Продукт</TableHead>
                <TableHead>Осталось</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell className="font-medium">
                    {item.product_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.quantity > 0 ? "default" : "secondary"}>
                      {item.quantity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      disabled={item.quantity === 0 || pendingId !== null}
                      onClick={() => handleActivate(item.product_id)}
                    >
                      {pendingId === item.product_id
                        ? "Активация…"
                        : "Активировать"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}