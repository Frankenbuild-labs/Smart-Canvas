// Bypass authentication for embedded mode
export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}