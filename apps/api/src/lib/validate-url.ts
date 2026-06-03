const CLOUDINARY_PATTERN = /^https:\/\/res\.cloudinary\.com\/[a-z0-9]+\//i

export function isValidCloudinaryUrl(url: string): boolean {
  if (!url) return false
  return CLOUDINARY_PATTERN.test(url)
}

export function isValidHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}
