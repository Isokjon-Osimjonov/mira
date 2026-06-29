// API error code → Uzbek message
export const ERROR_MESSAGES: Record<string, string> = {
  // Auth
  UNAUTHORIZED: 'Tizimga kirish talab qilinadi',
  FORBIDDEN: "Sizda bu amalni bajarish huquqi yo'q",
  INVALID_CREDENTIALS: "Noto'g'ri email yoki parol",
  ACCOUNT_LOCKED: 'Akkaunt vaqtincha bloklangan',
  TOKEN_EXPIRED: 'Sessiya muddati tugadi. Qayta kiring',
  TOKEN_INVALID: "Noto'g'ri token",
  REFRESH_INVALID: 'Sessiya yaroqsiz. Qayta kiring',
  MUST_CHANGE_PASSWORD: 'Parolni yangilash talab qilinadi',

  // Products
  PRODUCT_NOT_FOUND: 'Mahsulot topilmadi',
  PRODUCT_INACTIVE: 'Mahsulot nofaol',
  DUPLICATE_BARCODE: 'Bu barcode allaqachon mavjud',
  PRODUCT_NO_REGIONAL_CONFIG: 'Mintaqaviy narx sozlanmagan',

  // Orders
  ORDER_NOT_FOUND: 'Buyurtma topilmadi',
  ORDER_UNAUTHORIZED: "Bu buyurtmaga kirish huquqi yo'q",
  ORDER_ALREADY_CANCELED: 'Buyurtma allaqachon bekor qilingan',
  INVALID_STATUS_TRANSITION: "Bu holat o'zgarishiga ruxsat yo'q",
  PAYMENT_DEADLINE_PASSED: "To'lov muddati o'tib ketdi",
  CART_EMPTY: "Savat bo'sh",
  BOX_REQUIRED: 'Quti tanlash majburiy',
  ORDER_CANCEL_NOT_ALLOWED: "Bu buyurtmani bekor qilib bo'lmaydi",

  // Cart
  INSUFFICIENT_STOCK: "Yetarli mahsulot yo'q",
  INVALID_QUANTITY: "Noto'g'ri miqdor",
  CART_ITEM_NOT_FOUND: 'Savat elementi topilmadi',

  // Categories
  CATEGORY_NOT_FOUND: 'Kategoriya topilmadi',
  CATEGORY_HAS_PRODUCTS: "Bu kategoriyada mahsulotlar bor. Avval mahsulotlarni ko'chiring",

  // Coupons
  COUPON_NOT_FOUND: 'Kupon topilmadi',
  COUPON_INACTIVE: 'Kupon nofaol',
  COUPON_EXPIRED: 'Kupon muddati tugagan',
  COUPON_MAX_USES_REACHED: 'Kupon limiti tugagan',
  COUPON_MIN_ORDER_NOT_MET: 'Minimal buyurtma summasiga yetmadi',
  COUPON_FIRST_ORDER_ONLY: 'Bu kupon faqat birinchi buyurtma uchun',
  COUPON_ONE_PER_CUSTOMER: 'Bu kupondan faqat bir marta foydalanish mumkin',
  COUPON_DUPLICATE_CODE: 'Bu kupon kodi allaqachon mavjud',
  COUPON_ARCHIVED: "Arxivlangan kuponni o'zgartirib bo'lmaydi",
  COUPON_WRONG_CUSTOMER: 'Bu kupon siz uchun emas',
  COUPON_WRONG_PRODUCT: 'Bu kupon bu mahsulot uchun emas',
  COUPON_WRONG_CATEGORY: 'Bu kupon bu kategoriya uchun emas',
  COUPON_NOT_STARTED: 'Kupon hali faol emas',

  // Customers
  CUSTOMER_NOT_FOUND: 'Mijoz topilmadi',
  CUSTOMER_ALREADY_BLOCKED: 'Mijoz allaqachon bloklangan',
  CUSTOMER_HAS_ACTIVE_ORDERS: 'Mijozning faol buyurtmalari bor',
  TELEGRAM_ALREADY_LINKED: "Bu Telegram boshqa raqamga bog'langan",

  // Inventory
  BATCH_NOT_FOUND: 'Partiya topilmadi',
  WRITE_OFF_QTY_EXCEEDED: "Stokda yetarli mahsulot yo'q",
  BATCH_HAS_MOVEMENTS: 'Partiyadan mahsulot ishlatilgan',
  BATCH_HAS_RESERVATIONS: 'Partiyada band mahsulotlar bor',

  // Admin
  ADMIN_USER_NOT_FOUND: 'Admin foydalanuvchi topilmadi',
  ADMIN_USER_DUPLICATE_EMAIL: 'Bu email allaqachon mavjud',
  ADMIN_CANNOT_SELF_DEACTIVATE: "O'zingizni bloklashingiz mumkin emas",

  // AI
  AI_GENERATION_FAILED: 'AI kontent yarata olmadi. Qayta urining',
  AI_QUOTA_EXCEEDED: 'AI limit tugadi. Keyinroq urining',

  // General
  NOT_FOUND: 'Topilmadi',
  VALIDATION_ERROR: "Ma'lumotlar noto'g'ri",
  RATE_LIMITED: "So'rovlar limiti oshdi. Biroz kuting",
  INTERNAL_ERROR: 'Ichki xatolik yuz berdi',
}

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] ?? fallback ?? 'Xatolik yuz berdi'
}
