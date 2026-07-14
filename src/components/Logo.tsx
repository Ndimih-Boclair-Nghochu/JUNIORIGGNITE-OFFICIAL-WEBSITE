import logoUrl from '../assets/logo.png'

/** The JuniorIgnite brand mark (flame + book + sprout). */
export function Logo({ className }: { className?: string }): JSX.Element {
  return <img src={logoUrl} alt="JuniorIgnite" className={className} draggable={false} />
}

export { logoUrl }
