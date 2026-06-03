import { openai, VISION_MODEL } from '../../config/openai'
import { isValidCloudinaryUrl } from '../../lib/validate-url'
import { env } from '../../config/env'

export interface ProductImageAnalysisOutput {
  name: string
  brandName: string
  description: string
  ingredients: string[]
  skinTypes: string[]
  benefits: string[]
  howToUse: string
  volume: string
}

export interface TelegramPostAIOutput {
  content: string
  shortCaption: string
  hashtags: string[]
}

export interface TelegramPostImageInput {
  imageUrl: string // Cloudinary URL
  korRetailPrice: number // KRW
  uzsPrice: number // UZS calculated
  customNote?: string
}

// ─── EXISTING FUNCTIONS ───────────────────────────────────────

/**
 * AI-powered product content generation using OpenAI GPT-4o
 */
export async function generateProductContent(input: {
  productId?: string
  productName?: string
  barcode?: string
  imageUrl?: string
  categoryName?: string
  additionalInfo?: string
}): Promise<ProductImageAnalysisOutput> {
  if (!env.OPENAI_API_KEY) {
    throw {
      status: 500,
      code: 'AI_NOT_CONFIGURED',
      message: 'OpenAI API kaliti sozlanmagan',
    }
  }

  let productName = input.productName
  let barcode = input.barcode
  let imageUrl = input.imageUrl

  // If productId provided, fetch existing data
  if (input.productId) {
    const { products } = await import('@mira/db')
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../../config/db')

    const [existing] = await db
      .select()
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1)

    if (existing) {
      if (!productName) productName = existing.name
      if (!barcode) barcode = existing.barcode
      if (!imageUrl && existing.imageUrls?.length) {
        imageUrl = (existing.imageUrls as string[])[0]
      }
    }
  }

  const systemPrompt = `
Sen Koreya kosmetikasi ekspertisan. Mahsulot haqidagi ma'lumotlar asosida (nomi, barcode, rasm URL) mahsulot haqida to'liq tavsif va detallarni ber.
FAQAT JSON formatda javob ber — boshqa hech narsa yo'q.
  `.trim()

  let userPrompt = `
Ushbu kosmetik mahsulotni tahlil qil va quyidagi ma'lumotlarni ber:
${productName ? `Nomi: ${productName}` : ''}
${barcode ? `Barcode: ${barcode}` : ''}
${input.categoryName ? `Kategoriya: ${input.categoryName}` : ''}
${input.additionalInfo ? `Qo'shimcha: ${input.additionalInfo}` : ''}

QOIDALAR:
1. name: mahsulotning to'liq rasmiy nomi (inglizcha, original)
2. brandName: brend rasmiy nomi
3. descriptionUz: 2-3 paragraf, O'zbek tilida (lotin alifbosi), marketing tili
4. ingredients: mahsulotga xos asosiy faol moddalar (INCI nomida, inglizcha array)
5. skinTypes: faqat: ["oily","dry","combination","sensitive","normal","all"] (array)
6. benefits: 3-6 ta foyda O'zbek tilida (array)
7. howToUseUz: O'zbek tilida ketma-ket qadamlar
8. volume: hajm ("150ml", "50g" kabi)
9. weightGrams: faqat raqam (grammda, masalan: 150)

JSON:
{
  "name": "...",
  "brandName": "...",
  "descriptionUz": "...",
  "ingredients": ["...", "..."],
  "skinTypes": ["...", "..."],
  "benefits": ["...", "..."],
  "howToUseUz": "1. ...\n2. ...",
  "volume": "...",
  "weightGrams": 0
}
  `.trim()

  try {
    const messages: any[] = [{ role: 'system', content: systemPrompt }]

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: { url: imageUrl, detail: 'high' },
          },
        ],
      })
    } else {
      messages.push({ role: 'user', content: userPrompt })
    }

    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error('[AI Service] Empty response from OpenAI')
      throw new Error('OpenAI empty response')
    }

    try {
      return JSON.parse(content)
    } catch (parseErr) {
      console.error('[AI Service] JSON Parse Error:', parseErr, '\nContent:', content)
      throw new Error('AI returned invalid JSON')
    }
  } catch (err: any) {
    console.error('[AI Service] Error generating product content:', err)
    if (err.status === 429) {
      throw { status: 429, code: 'AI_QUOTA_EXCEEDED', message: 'OpenAI limit oshdi.' }
    }
    throw {
      status: 500,
      code: 'AI_GENERATION_FAILED',
      message: err.message || "AI ma'lumot yarata olmadi. Qayta urining.",
    }
  }
}

/**
 * EXISTING: Gemini-powered Telegram post generation from product data
 */
export async function generateTelegramPost(
  productId: string,
  customNote?: string
): Promise<TelegramPostAIOutput> {
  // Skeleton implementation for Gemini
  throw new Error('Gemini post generation not implemented or configuration missing')
}

// ─── NEW FUNCTIONS (OpenAI GPT-4o Vision) ─────────────────────

export async function analyzeProductImage(
  imageUrl: string,
  categoryName?: string,
  additionalInfo?: string
): Promise<ProductImageAnalysisOutput> {
  // Security: validate URL before sending to OpenAI
  if (!isValidCloudinaryUrl(imageUrl)) {
    throw {
      status: 400,
      code: 'INVALID_URL',
      message: 'Faqat Cloudinary URL qabul qilinadi',
    }
  }

  const systemPrompt = `
Sen Koreya kosmetikasi ekspertisan va mahsulot rasmlarini tahlil qilasan.
Rasm asosida mahsulot haqida to'liq ma'lumot ber.
FAQAT JSON formatda javob ber — boshqa hech narsa yo'q.
  `.trim()

  const userPrompt = `
Ushbu kosmetik mahsulot rasmini tahlil qil va quyidagi ma'lumotlarni ber:
${categoryName ? `Kategoriya: ${categoryName}` : ''}
${additionalInfo ? `Qo'shimcha: ${additionalInfo}` : ''}

QOIDALAR:
1. name: mahsulotning to'liq rasmiy nomi (inglizcha, original)
   Misol: "COSRX AHA/BHA Clarifying Treatment Toner"
2. brandName: brend rasmiy nomi
   Misol: "COSRX", "SOME BY MI", "Beauty of Joseon"
3. description: 2-3 paragraf, O'zbek tilida (lotin alifbosi), marketing tili
4. ingredients: ramda ko'ringan yoki ushbu mahsulotga xos asosiy faol moddalar
   (INCI nomida, inglizcha)
5. skinTypes: faqat: ["oily","dry","combination","sensitive","normal","all"]
6. benefits: 3-6 ta foyda O'zbek tilida
7. howToUse: O'zbek tilida ketma-ket qadamlar
8. volume: ramda ko'ringan hajm ("150ml", "50g" kabi)

JSON:
{
  "name": "...",
  "brandName": "...",
  "description": "...",
  "ingredients": ["...", "..."],
  "skinTypes": ["...", "..."],
  "benefits": ["...", "..."],
  "howToUse": "1. ...\n2. ...",
  "volume": "..."
}
  `.trim()

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('OpenAI empty response')

    const parsed: ProductImageAnalysisOutput = JSON.parse(content)

    // Validate required fields
    if (!parsed.name || !parsed.brandName || !parsed.description) {
      throw new Error('AI response missing required fields')
    }

    return parsed
  } catch (err: any) {
    // Handle OpenAI specific errors
    if (err.status === 429) {
      throw {
        status: 429,
        code: 'AI_QUOTA_EXCEEDED',
        message: "OpenAI limit oshdi. Keyinroq urinib ko'ring.",
      }
    }
    if (err.status === 401) {
      throw {
        status: 500,
        code: 'AI_AUTH_ERROR',
        message: 'AI xizmati sozlanmagan.',
      }
    }
    throw {
      status: 500,
      code: 'AI_GENERATION_FAILED',
      message: 'Rasm tahlil qilinmadi. Qayta urining.',
    }
  }
}

export async function generateTelegramPostFromImage(
  input: TelegramPostImageInput
): Promise<TelegramPostAIOutput> {
  if (!isValidCloudinaryUrl(input.imageUrl)) {
    throw {
      status: 400,
      code: 'INVALID_URL',
      message: 'Faqat Cloudinary URL qabul qilinadi',
    }
  }

  const userPrompt = `
Mira Cosmetics Telegram kanali uchun ushbu mahsulot rasmiga post yoz.

Narxi: ₩${input.korRetailPrice.toLocaleString()} / ${input.uzsPrice.toLocaleString()} so'm
${input.customNote ? `Admin eslatmasi: ${input.customNote}` : ''}

QOIDALAR:
1. Til: O'zbek (lotin alifbosi)
2. FAQAT JSON — boshqa matn yo'q
3. content: to'liq HTML post
   Ruxsat: <b> <i> <code> FAQAT
   TAQIQ: <h1> <h2> <p> <br> boshqa har qanday HTML teg
4. Ramdan mahsulot nomini, brendi, foydasini aniqlash
5. Emoji keng ishlatish (kosmetika tematikasi)
6. Narxni ikka valyutada ko'rsatish
7. Oxirida CTA: "📦 Buyurtma berish uchun: /start"
8. shortCaption: max 800 belgi (rasm uchun)
9. hashtags: 5-7 ta, #MiraCosmetics majburiy

JSON:
{
  "content": "...",
  "shortCaption": "...",
  "hashtags": ["#...", "#..."]
}
  `.trim()

  try {
    const response = await openai.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: input.imageUrl, detail: 'high' },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('Empty response')

    const parsed: TelegramPostAIOutput = JSON.parse(content)

    // Enforce limits
    if (parsed.shortCaption?.length > 1024) {
      parsed.shortCaption = parsed.shortCaption.slice(0, 1020) + '...'
    }
    if (parsed.content?.length > 4096) {
      parsed.content = parsed.content.slice(0, 4092) + '...'
    }

    return parsed
  } catch (err: any) {
    if (err.status === 429)
      throw { status: 429, code: 'AI_QUOTA_EXCEEDED', message: 'OpenAI limit oshdi.' }
    throw { status: 500, code: 'AI_GENERATION_FAILED', message: 'Post yaratilmadi. Qayta urining.' }
  }
}
