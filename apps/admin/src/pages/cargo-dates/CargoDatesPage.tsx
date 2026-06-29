import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'

interface CargoDate {
  id: string
  cargoDate: string
  note: string | null
  isActive: boolean
}

export function CargoDatesPage() {
  const queryClient = useQueryClient()
  const [newDate, setNewDate] = useState('')
  const [newNote, setNewNote] = useState('')

  const { data: dates = [], isLoading } = useQuery<CargoDate[]>({
    queryKey: ['cargo-dates'],
    queryFn: async () => {
      const res = await api.get('/admin/cargo-dates')
      return res.data.data
    },
  })

  const createMut = useMutation({
    mutationFn: async () => {
      await api.post('/admin/cargo-dates', { cargoDate: newDate, note: newNote || null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargo-dates'] })
      setNewDate('')
      setNewNote('')
    },
  })

  const updateMut = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/admin/cargo-dates/${id}`, { isActive })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cargo-dates'] }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/cargo-dates/${id}`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cargo-dates'] }),
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Yuk sanalari</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Koreyadan O'zbekistonga yuk jo'natish jadvali
        </p>
      </div>

      <div className="flex items-center space-x-2 bg-white p-4 rounded-lg border">
        <Input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="w-[200px]"
        />
        <Input
          placeholder="Izoh, masalan: oddiy jadval"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => createMut.mutate()} disabled={!newDate || createMut.isPending}>
          <Plus className="mr-2 h-4 w-4" /> Qo'shish
        </Button>
      </div>

      <div className="bg-white rounded-lg border divide-y">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Yuklanmoqda...</div>
        ) : dates.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">Ma'lumot topilmadi</div>
        ) : (
          dates.map((date) => {
            const isPast = new Date(date.cargoDate) < new Date(new Date().setHours(0, 0, 0, 0))
            return (
              <div
                key={date.id}
                className={`flex items-center justify-between p-4 ${isPast ? 'opacity-50 grayscale' : ''}`}
              >
                <div>
                  <p className={`font-medium ${isPast ? 'line-through' : ''}`}>
                    {format(new Date(date.cargoDate), 'dd.MM.yyyy')}
                  </p>
                  {date.note && <p className="text-sm text-muted-foreground">{date.note}</p>}
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={date.isActive}
                      onCheckedChange={(checked) =>
                        updateMut.mutate({ id: date.id, isActive: checked })
                      }
                    />
                    <span className="text-sm">Faol</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Rostdan ham o'chirmoqchimisiz?")) deleteMut.mutate(date.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
