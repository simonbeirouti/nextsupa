import { Suspense } from "react"
import { connection } from "next/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { IngestionDashboard } from "@/components/ingestion-dashboard"
import {
  getCrawlRunDetail,
  listCrawlRuns,
} from "@/lib/ingestion"

type IngestionSearchParams = {
  run?: string | string[]
  runPage?: string | string[]
  item?: string | string[]
  actionError?: string | string[]
  actionMessage?: string | string[]
}

type PageProps = {
  searchParams: Promise<IngestionSearchParams>
}

function getSingleValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function getPositiveInteger(value?: string | string[], fallback = 1) {
  const parsed = Number.parseInt(getSingleValue(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

async function IngestionPageContent({ searchParams }: PageProps) {
  await connection()

  const params = await searchParams
  const requestedRunId = getSingleValue(params.run)
  const requestedRunPage = getPositiveInteger(params.runPage, 1)
  const requestedItemId = getSingleValue(params.item)
  const actionError = getSingleValue(params.actionError)
  const actionMessage = getSingleValue(params.actionMessage)

  const runsResponse = await listCrawlRuns({
    limit: 10,
    page: requestedRunPage,
    sortBy: "updated_at",
    direction: "desc",
  })
  const runs = runsResponse.runs
  const fallbackRunId = runs[0]?.id ?? ""
  const initialRunId = requestedRunId || fallbackRunId
  const initialDetail = initialRunId ? await getCrawlRunDetail(initialRunId) : null

  return (
    <IngestionDashboard
      key={`${initialDetail?.run.id ?? "none"}:${requestedItemId}`}
      actionError={actionError}
      actionMessage={actionMessage}
      initialDetail={initialDetail}
      initialRunPage={runsResponse.pagination.page}
      initialRunPagination={runsResponse.pagination}
      initialRuns={runs}
      initialSelectedItemId={requestedItemId}
    />
  )
}

function IngestionPageFallback() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex min-h-full w-full flex-col gap-6 py-6">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Loading operations view</CardTitle>
            <CardDescription>
              Fetching query runs, crawl detail, and item progress.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  )
}

export default function IngestionPage(props: PageProps) {
  return (
    <Suspense fallback={<IngestionPageFallback />}>
      <IngestionPageContent {...props} />
    </Suspense>
  )
}
