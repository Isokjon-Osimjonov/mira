import { useState } from 'react'
import { Upload, Link, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ImageUploadFieldProps {
  mode: 'single' | 'multi'
  value: string | string[]
  onChange: (value: string | string[]) => void
  uploadFn: (file: File) => Promise<string>
  disabled?: boolean
  label?: string
}

export function ImageUploadField({
  mode,
  value,
  onChange,
  uploadFn,
  disabled = false,
  label = 'Rasmlar',
}: ImageUploadFieldProps) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)

  // Normalize to array internally
  const images: string[] =
    mode === 'multi' ? ((value as string[]) ?? []) : value ? [value as string] : []

  const addImage = (url: string) => {
    if (!url.startsWith('http')) {
      toast.error("To'g'ri URL kiriting")
      return
    }
    if (mode === 'single') {
      onChange(url)
    } else {
      onChange([...images, url])
    }
  }

  const removeImage = (url: string) => {
    if (mode === 'single') {
      onChange('')
    } else {
      onChange(images.filter((u) => u !== url))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    // Convert FileList to Array — FileList is not a real array
    const files = Array.from(fileList)

    setUploading(true)
    try {
      const urls = await Promise.all(files.map(uploadFn))
      if (mode === 'single') {
        onChange(urls[0])
      } else {
        onChange([...images, ...urls])
      }
      toast.success(urls.length > 1 ? `${urls.length} ta rasm yuklandi` : 'Rasm yuklandi')
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error("Rasm yuklab bo'lmadi")
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleUrlAdd = () => {
    if (!urlInput.trim()) return
    addImage(urlInput.trim())
    setUrlInput('')
  }

  return (
    <div className="space-y-3">
      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group shrink-0">
              <img
                src={url}
                alt={`img-${i}`}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = 'https://placehold.co/100?text=Error'
                }}
                className={cn(
                  'object-cover rounded-lg',
                  'border-[0.5px] border-border',
                  mode === 'single' ? 'w-16 h-16' : 'w-14 h-14'
                )}
              />
              {/* "Asosiy" badge on first product image */}
              {mode === 'multi' && i === 0 && (
                <span
                  className="absolute bottom-0 left-0
                                 right-0 text-[9px] text-center
                                 bg-primary/80 text-white
                                 rounded-b-lg py-0.5 leading-tight"
                >
                  Asosiy
                </span>
              )}
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -top-1.5 -right-1.5
                           w-4 h-4 bg-red-500 text-white
                           rounded-full flex items-center
                           justify-center opacity-0
                           group-hover:opacity-100
                           transition-opacity"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={cn(
            'flex-1 flex items-center justify-center',
            'gap-1.5 py-1.5 rounded-md text-xs font-medium',
            'transition-all',
            tab === 'upload'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-muted-foreground hover:text-gray-700'
          )}
        >
          <Upload className="h-3 w-3" strokeWidth={1.5} />
          Yuklash
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={cn(
            'flex-1 flex items-center justify-center',
            'gap-1.5 py-1.5 rounded-md text-xs font-medium',
            'transition-all',
            tab === 'url'
              ? 'bg-white shadow-sm text-gray-900'
              : 'text-muted-foreground hover:text-gray-700'
          )}
        >
          <Link className="h-3 w-3" strokeWidth={1.5} />
          URL orqali
        </button>
      </div>

      {/* Upload from device */}
      {tab === 'upload' && (
        <label
          className={cn(
            'flex items-center justify-center gap-2',
            'px-4 py-3 rounded-lg cursor-pointer',
            'border-[0.5px] border-dashed border-border',
            'text-sm text-muted-foreground',
            'hover:border-primary hover:text-primary',
            'transition-colors',
            (uploading || disabled) && 'opacity-50 pointer-events-none'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Yuklanmoqda...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              {mode === 'multi' ? "Rasmlarni yuklash (ko'p tanlash mumkin)" : 'Rasm yuklash'}
            </>
          )}
          <input
            type="file"
            multiple={mode === 'multi'}
            accept="image/*"
            className="hidden"
            disabled={uploading || disabled}
            onChange={handleFileUpload}
          />
        </label>
      )}

      {/* URL input */}
      {tab === 'url' && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleUrlAdd()
              }
            }}
            placeholder="https://... rasm manzili"
            className="h-9 text-sm rounded-lg border-[0.5px]
                       flex-1"
            disabled={disabled}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleUrlAdd}
            disabled={!urlInput.trim() || disabled}
            className="h-9 rounded-lg px-3 text-xs shrink-0"
          >
            Qo'shish
          </Button>
        </div>
      )}
    </div>
  )
}
