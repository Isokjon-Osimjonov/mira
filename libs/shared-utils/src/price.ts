export const formatKRW = (n: number) => `₩${n.toLocaleString('ko-KR')}`
export const formatUZS = (n: number) => `${Math.round(n).toLocaleString('uz-UZ')} so'm`
export const krwToUzs = (krw: number, rate: number) => krw * rate
export const usdToKrw = (usd: number, rate: number) => Math.round(usd * rate)
export const calcCargoKrw = (weightKg: number, rateUsdKrw: number, perKg = 10) =>
  usdToKrw(weightKg * perKg, rateUsdKrw)
