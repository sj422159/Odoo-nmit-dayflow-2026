import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Primitives'

export default function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" description="The requested Dayflow page does not exist." />
      <Card className="p-6 text-sm text-away">Use the navigation to return to your workspace.</Card>
    </>
  )
}
