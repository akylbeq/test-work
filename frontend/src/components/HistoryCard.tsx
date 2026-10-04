import { useEffect, useState } from "react"
import { api, errorMessage, type ActivationItem } from "@/api"
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
}

export function HistoryCard({ userId, refreshKey }: Props) {
  const [items, setItems] = useState<ActivationItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .getActivations(userId)
      .then((data) => {
        if (!cancelled) {
          setItems(data)
          setError(null)
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [userId, refreshKey])

  return (
    <Card>
      <CardHeader>
        <CardTitle>История активаций</CardTitle>
        <CardDescription>Новые записи сверху.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <ErrorAlert message={error} />
        ) : items === null ? (
          <LoadingRows />
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Активаций пока не было.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Продукт</TableHead>
                <TableHead className="text-right">Когда</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.product_name}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(item.activated_at).toLocaleString("ru-RU")}
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