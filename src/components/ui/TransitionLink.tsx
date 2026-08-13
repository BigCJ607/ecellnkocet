import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface TransitionLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
  children: React.ReactNode
  variant?: 'standard' | 'eye' | 'slash'
}

export default function TransitionLink({ to, children, onClick, className, style, variant = 'standard', ...rest }: TransitionLinkProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    e.preventDefault()
    
    // If we're already on the path, just do normal click or ignore
    if (location.pathname === to) {
      if (onClick) onClick(e)
      return
    }

    if (onClick) onClick(e)

    const origin = { x: e.clientX, y: e.clientY }

    // Trigger Wipe In
    window.dispatchEvent(new CustomEvent('page-transition', { 
      detail: { 
        action: 'in', 
        variant, 
        origin,
        onComplete: () => {
          navigate(to)
          // Small deferral to ensure React Router mounts the new page
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('page-transition', { detail: { action: 'out', variant, origin } }))
          }, 30)
        }
      } 
    }))
  }

  return (
    <a href={to} onClick={handleClick} className={className} style={style} {...rest}>
      {children}
    </a>
  )
}
