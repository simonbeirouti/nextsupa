import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export default function Loading() {
  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4">
        <Card className="border border-border/70 bg-card/85 shadow-sm backdrop-blur-sm">
          <CardHeader className="gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardHeader>
        </Card>

        <Card className="min-h-0 flex-1 border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="gap-3">
            <Skeleton className="h-5 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardHeader>
          <CardContent className="grid min-h-0 flex-1 gap-3 overflow-hidden pb-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-0 border border-border/70 bg-card/85 shadow-sm backdrop-blur-sm">
        <CardHeader className="gap-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="min-h-0">
          <Skeleton className="h-[70vh] w-full rounded-xl" />
        </CardContent>
      </Card>
    </div>
  )
}
