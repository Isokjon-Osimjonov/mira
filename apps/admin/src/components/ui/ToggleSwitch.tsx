import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleSwitchProps) {
  const isSmall = size === 'sm'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0',
        'rounded-full transition-colors duration-200',
        'focus:outline-none',
        isSmall ? 'w-9 h-5' : 'w-11 h-6',
        checked ? 'bg-primary' : 'bg-gray-200',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block',
          'rounded-full bg-white shadow-sm',
          'ring-0 transition-transform duration-200',
          'absolute top-0.5',
          isSmall ? 'w-4 h-4' : 'w-5 h-5',
          checked ? (isSmall ? 'translate-x-[18px]' : 'translate-x-[22px]') : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
