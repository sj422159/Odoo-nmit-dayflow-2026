import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Primitives'

export default function PlaceholderPage() {
  return (
    <>
      <PageHeader title="Coming soon" description="This Dayflow workspace is being prepared." />
      <Card className="p-6 text-sm text-away">This area is not available in the current build.</Card>
    </>
  )
}
