import api from '../lib/api'

export interface PaymentMethod {
  type: string
  isEnabled: boolean
  bankName: string
  accountNumber: string
  holderName: string
}

export const paymentService = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await api.get('/settings/payment-info')
    const data = res.data.data

    return [
      {
        type: 'UZB_BANK',
        isEnabled: true,
        bankName: data.uzb?.bankName || '',
        accountNumber: data.uzb?.bankNumber || '',
        holderName: data.uzb?.bankHolder || '',
      },
      {
        type: 'KOR_BANK',
        isEnabled: true,
        bankName: data.kor?.bankName || '',
        accountNumber: data.kor?.bankNumber || '',
        holderName: data.kor?.bankHolder || '',
      },
    ]
  },
}
