'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LABS = [
  { href: '/vacuum-lab', label: 'VAC', title: 'Vacuum lab' },
  { href: '/slime-prototype', label: 'SLIME', title: 'Locked slime prototype' },
  { href: '/experiment-lab', label: 'EXP', title: 'Experimental lab' },
]

function isActive(pathname: string, href: string) {
  if (href === '/vacuum-lab') return pathname === '/' || pathname === '/vacuum-lab'
  return pathname === href
}

export function DevLabSwitcher() {
  const pathname = usePathname()
  const shouldShow = LABS.some((lab) => isActive(pathname, lab.href))

  if (!shouldShow) return null

  return (
    <nav className="devLabSwitcher" aria-label="Dev lab switcher" data-testid="dev-lab-switcher">
      {LABS.map((lab) => (
        <Link
          key={lab.href}
          className={isActive(pathname, lab.href) ? 'active' : undefined}
          href={lab.href}
          title={lab.title}
          data-lab-link={lab.href}
        >
          {lab.label}
        </Link>
      ))}
    </nav>
  )
}
