import { forwardRef, type ComponentPropsWithoutRef } from 'react'

const Card = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Card({ children, className = '', ...rest }, ref) {
  return (
    <div ref={ref} className={`se-card ${className}`} {...rest}>
      {children}
    </div>
  )
})

export default Card
