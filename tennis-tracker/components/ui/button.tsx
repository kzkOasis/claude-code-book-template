import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            default:     'bg-blue-500 hover:bg-blue-600 text-white',
            outline:     'border border-white/10 bg-white/5 hover:bg-white/10 text-white',
            ghost:       'hover:bg-white/10 text-white/70 hover:text-white',
            destructive: 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20',
            success:     'bg-emerald-500 hover:bg-emerald-600 text-white',
          }[variant],
          {
            sm:   'text-xs px-3 py-1.5 gap-1.5',
            md:   'text-sm px-4 py-2.5 gap-2',
            lg:   'text-base px-6 py-3.5 gap-2',
            icon: 'w-9 h-9',
          }[size],
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
export { Button }
