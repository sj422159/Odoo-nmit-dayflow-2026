import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, Card } from '@/components/ui/Primitives'

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="flex max-w-md flex-col items-center gap-3 p-8 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-flow-50 text-flow-600">
          <Compass className="h-6 w-6" aria-hidden />
        </span>
        <p className="text-eyebrow uppercase text-away">404</p>
        <h1 className="text-display tracking-tight text-ink">Page not found</h1>
        <p className="text-sm text-ink-600">
          The page you are looking for does not exist, or you do not have access to it.
        </p>
        <Link to="/dashboard" className="mt-2">
          <Button>Back to dashboard</Button>
        </Link>
      </Card>
    </div>
  )
}
