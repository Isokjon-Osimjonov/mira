import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { QK } from '../constants/query-keys'

export function useExchangeRate() {
  const { data } = useQuery({
    queryKey: QK.EXCHANGE_LATEST,
    queryFn: async () => {
      const res = await api.get('/exchange-rates/latest')
      return res.data.data
    },
    staleTime: 5 * 60 * 1000,
  })
  return {
    rate: data?.krwToUzs ?? null,
    rateData: data ?? null,
  }
}
