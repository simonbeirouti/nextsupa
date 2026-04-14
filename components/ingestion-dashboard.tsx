"use client"

import { startTransition, useEffectEvent, useState } from "react"
import Link from "next/link"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { IngestionLiveUpdates } from "@/components/ingestion-live-updates"
import {
  cancelCrawlRunAction,
  deleteCrawlRunAction,
  deleteJobAction,
  queueFigshareSearchSyncAction,
  refreshSourceItemAction,
  reingestSourceItemAction,
  rerunCrawlRunAction,
  retryJobAction,
} from "@/app/ingestion/actions"
import {
  getCrawlRunDetail,
  listCrawlRuns,
  type CrawlRunDetail,
  type CrawlRunItemSummary,
  type CrawlRunSummary,
  type IngestionJobRecord,
  type PaginationMeta,
} from "@/lib/ingestion"

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

type IngestionDashboardProps = {
  actionError: string
  actionMessage: string
  initialDetail: CrawlRunDetail | null
  initialRunPage: number
  initialRunPagination: PaginationMeta
  initialRuns: CrawlRunSummary[]
  initialSelectedItemId: string
}

const PAGE_SIZE = 10

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return "Not available"
  }

  return dateTimeFormatter.format(parsed)
}

function getStatusVariant(status: string) {
  if (
    status === "completed" ||
    status === "synced" ||
    status === "embedded" ||
    status === "documents_ready" ||
    status === "files_stored" ||
    status === "metadata_ready"
  ) {
    return "secondary" as const
  }

  if (
    status === "failed" ||
    status === "partial_failure" ||
    status === "manual_review"
  ) {
    return "destructive" as const
  }

  if (status === "processing" || status === "retrying") {
    return "default" as const
  }

  return "outline" as const
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={getStatusVariant(status)}>{status}</Badge>
}

function getRunQuery(run: CrawlRunSummary) {
  return run.query?.trim() || "Untitled query"
}

function getRunConfig(run: CrawlRunSummary) {
  const stats =
    run.stats && typeof run.stats === "object" && !Array.isArray(run.stats)
      ? (run.stats as Record<string, unknown>)
      : {}

  return {
    query: run.query?.trim() || "",
    itemType:
      typeof stats.item_type === "number" ? String(stats.item_type) : "",
    order: typeof stats.order === "string" ? stats.order : "published_date",
    direction:
      typeof stats.order_direction === "string" &&
      stats.order_direction === "asc"
        ? "asc"
        : "desc",
    publishedSince:
      typeof stats.published_since === "string" ? stats.published_since : "",
  }
}

function getRunErrorContext(run: CrawlRunSummary) {
  const stats =
    run.stats && typeof run.stats === "object" && !Array.isArray(run.stats)
      ? (run.stats as Record<string, unknown>)
      : {}

  return {
    lastErrorAt:
      typeof stats.last_error_at === "string" ? stats.last_error_at : null,
    lastErrorJobType:
      typeof stats.last_error_job_type === "string"
        ? stats.last_error_job_type
        : null,
    lastErrorMessage:
      typeof stats.last_error_message === "string"
        ? stats.last_error_message
        : run.error_message,
    lastErrorWillRetry: stats.last_error_will_retry === true,
  }
}

function getRunMetrics(detail: CrawlRunDetail) {
  const readyToScanCount = detail.items.length
  const scannedCount = detail.items.filter(
    (item) => item.sync_status === "synced"
  ).length
  const processingCount = detail.items.filter(
    (item) =>
      item.sync_status === "queued" ||
      item.sync_status === "processing" ||
      item.ingestion_status === "processing"
  ).length
  const errorCount = detail.items.filter(
    (item) =>
      item.latest_error_code || item.ingestion_status === "manual_review"
  ).length
  const downloadedCount = detail.items.reduce(
    (total, item) => total + item.download_stored_count,
    0
  )

  return {
    readyToScanCount,
    scannedCount,
    processingCount,
    errorCount,
    downloadedCount,
    pagesProcessed: detail.run.pages_processed,
    discoveredItems: detail.run.discovered_items,
    queuedRefreshJobs: detail.run.refresh_jobs_queued,
    activeJobs:
      detail.run.related_job_count - detail.run.related_job_terminal_count,
    failedJobs: detail.run.related_job_failed_count,
  }
}

function getSelectedItem(
  detail: CrawlRunDetail | null,
  selectedItemId: string
): CrawlRunItemSummary | null {
  if (!detail || detail.items.length === 0) {
    return null
  }

  if (selectedItemId) {
    return detail.items.find((item) => item.id === selectedItemId) ?? null
  }

  return (
    detail.items.find((item) => item.latest_error_code) ??
    detail.items.find((item) => item.active_job_count > 0) ??
    detail.items[0] ??
    null
  )
}

function mergeSelectedRunIntoHistory(
  runs: CrawlRunSummary[],
  selectedRun: CrawlRunSummary | null
) {
  if (!selectedRun) {
    return runs.slice(0, PAGE_SIZE)
  }

  if (runs.some((run) => run.id === selectedRun.id)) {
    return runs.slice(0, PAGE_SIZE)
  }

  return [selectedRun, ...runs].slice(0, PAGE_SIZE)
}

function createIngestionHref(runId?: string | null, itemId?: string | null) {
  const params = new URLSearchParams()

  if (runId) {
    params.set("run", runId)
  }

  if (itemId) {
    params.set("item", itemId)
  }

  const query = params.toString()
  return query ? `/ingestion?${query}` : "/ingestion"
}

function PaginationControls({
  page,
  total,
  pageSize,
  onNext,
  onPrevious,
}: {
  page: number
  total: number
  pageSize: number
  onNext: () => void
  onPrevious: () => void
}) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  return (
    <div className="flex items-center justify-between gap-3 pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint: string
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        {hint}
      </CardContent>
    </Card>
  )
}

function Notice({
  message,
  variant,
}: {
  message: string
  variant: "error" | "success"
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        variant === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      )}
    >
      {message}
    </div>
  )
}

function RunHistory({
  onNextPage,
  onPreviousPage,
  pagination,
  runs,
  selectedRunId,
}: {
  onNextPage: () => void
  onPreviousPage: () => void
  pagination: PaginationMeta
  runs: CrawlRunSummary[]
  selectedRunId: string
}) {
  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <CardTitle>Query history</CardTitle>
        <CardDescription>
          Every crawl run stays addressable. Selecting a run swaps the live data
          shown on this page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {runs.length === 0 ? (
          <Empty className="min-h-0 border border-dashed bg-background/40 py-8">
            <EmptyHeader>
              <EmptyTitle>No query history yet</EmptyTitle>
              <EmptyDescription>
                Start a Figshare query to create the first durable crawl run.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {runs.map((run) => {
          const isSelected = run.id === selectedRunId
          const runError = getRunErrorContext(run)

          return (
            <Link
              key={run.id}
              href={createIngestionHref(run.id, null)}
              className={cn(
                "block rounded-lg border px-4 py-3 transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/60 hover:bg-background/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="line-clamp-2 font-medium">{getRunQuery(run)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(run.created_at)}
                  </p>
                </div>
                <StatusBadge status={run.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{run.discovered_items} discovered</span>
                <span>{run.pages_processed} pages</span>
                <span>{run.related_job_failed_count} failed jobs</span>
              </div>
              {runError.lastErrorMessage ? (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                  {runError.lastErrorWillRetry ? "Retrying:" : "Last error:"}{" "}
                  {runError.lastErrorMessage}
                </p>
              ) : null}
            </Link>
          )
        })}
      </CardContent>
      <CardContent className="pt-0">
        <PaginationControls
          page={pagination.page}
          total={pagination.total}
          pageSize={pagination.limit}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
        />
      </CardContent>
    </Card>
  )
}

function StartRunCard() {
  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Start a query</CardTitle>
        <CardDescription>
          Enter a Figshare query. The backend will crawl results, store
          metadata, and queue file downloads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={queueFigshareSearchSyncAction} className="grid gap-4">
          <input type="hidden" name="redirectTo" value="/ingestion" />
          <label className="grid gap-2">
            <span className="text-sm font-medium">Query</span>
            <input
              name="query"
              required
              placeholder="eg. coral bleaching"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Order</span>
              <select
                name="order"
                defaultValue="published_date"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="published_date">Published date</option>
                <option value="modified_date">Modified date</option>
                <option value="created_date">Created date</option>
                <option value="downloads">Downloads</option>
                <option value="views">Views</option>
                <option value="shares">Shares</option>
                <option value="cites">Cites</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Direction</span>
              <select
                name="direction"
                defaultValue="desc"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Published since</span>
              <input
                type="date"
                name="publishedSince"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              The new run appears in history immediately and updates live as
              jobs move.
            </p>
            <Button type="submit">Start crawl</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function RunOverview({
  detail,
  selectedItem,
}: {
  detail: CrawlRunDetail
  selectedItem: CrawlRunItemSummary | null
}) {
  const metrics = getRunMetrics(detail)
  const runConfig = getRunConfig(detail.run)
  const runError = getRunErrorContext(detail.run)
  const canStop =
    detail.run.status === "queued" ||
    detail.run.status === "processing" ||
    detail.run.status === "retrying"

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-card/85">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Figshare crawl</Badge>
            <StatusBadge status={detail.run.status} />
            <Badge variant="outline">{detail.items.length} tracked items</Badge>
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-3xl leading-tight">
                {getRunQuery(detail.run)}
              </CardTitle>
              <CardDescription>
                Created {formatDateTime(detail.run.created_at)}. Last updated{" "}
                {formatDateTime(detail.run.updated_at)}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <form action={rerunCrawlRunAction}>
                <input type="hidden" name="redirectTo" value="/ingestion" />
                <input type="hidden" name="query" value={runConfig.query} />
                <input
                  type="hidden"
                  name="itemType"
                  value={runConfig.itemType}
                />
                <input type="hidden" name="order" value={runConfig.order} />
                <input
                  type="hidden"
                  name="direction"
                  value={runConfig.direction}
                />
                <input
                  type="hidden"
                  name="publishedSince"
                  value={runConfig.publishedSince}
                />
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!runConfig.query}
                >
                  Rerun query
                </Button>
              </form>
              <form action={cancelCrawlRunAction}>
                <input type="hidden" name="crawlRunId" value={detail.run.id} />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={createIngestionHref(
                    detail.run.id,
                    selectedItem?.id ?? null
                  )}
                />
                <Button type="submit" variant="outline" disabled={!canStop}>
                  Stop
                </Button>
              </form>
              <form action={deleteCrawlRunAction}>
                <input type="hidden" name="crawlRunId" value={detail.run.id} />
                <input type="hidden" name="redirectTo" value="/ingestion" />
                <Button type="submit" variant="ghost">
                  Delete run
                </Button>
              </form>
            </div>
          </div>
        </CardHeader>
      </Card>

      {runError.lastErrorMessage ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            runError.lastErrorWillRetry
              ? "border-amber-500/30 bg-amber-500/10 text-amber-800"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">
              {runError.lastErrorWillRetry
                ? "Run interrupted, retry scheduled"
                : "Run failure"}
            </span>
            {runError.lastErrorJobType ? (
              <Badge variant="outline">{runError.lastErrorJobType}</Badge>
            ) : null}
            {runError.lastErrorAt ? (
              <span className="text-xs">
                {formatDateTime(runError.lastErrorAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-2">{runError.lastErrorMessage}</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Pages processed"
          value={metrics.pagesProcessed}
          hint="How far the discovery crawl has moved through results."
        />
        <MetricCard
          label="Items discovered"
          value={metrics.discoveredItems}
          hint="Metadata records discovered for this query."
        />
        <MetricCard
          label="Active jobs"
          value={metrics.activeJobs}
          hint="Queued or processing jobs still attached to this run."
        />
        <MetricCard
          label="Items scanned"
          value={metrics.scannedCount}
          hint="Items whose metadata sync has completed."
        />
        <MetricCard
          label="Failed jobs"
          value={metrics.failedJobs}
          hint="Terminal failures recorded against this run."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Ready to scan"
          value={metrics.readyToScanCount}
          hint="Items currently attached to this query run."
        />
        <MetricCard
          label="Processing items"
          value={metrics.processingCount}
          hint="Items still moving through metadata or file work."
        />
        <MetricCard
          label="Item errors"
          value={metrics.errorCount}
          hint="Items with manual review or terminal job failures."
        />
        <MetricCard
          label="Files stored"
          value={metrics.downloadedCount}
          hint="Files already downloaded into storage."
        />
      </div>
    </div>
  )
}

function RunJobActivity({
  run,
  jobs,
}: {
  run: CrawlRunSummary
  jobs: IngestionJobRecord[]
}) {
  const [jobPage, setJobPage] = useState(1)
  const paginatedJobs = jobs.slice(
    (jobPage - 1) * PAGE_SIZE,
    jobPage * PAGE_SIZE
  )

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Run activity</CardTitle>
        <CardDescription>
          Recent jobs for this query run. Use this to track discovery and
          re-open older runs even before items appear below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <Empty className="min-h-0 border border-dashed bg-background/30 py-10">
            <EmptyHeader>
              <EmptyTitle>No jobs recorded yet</EmptyTitle>
              <EmptyDescription>
                The run exists, but no worker job has been written back yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[220px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{job.job_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {job.id.slice(0, 8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {job.stage}
                  </TableCell>
                  <TableCell className="max-w-sm text-sm text-muted-foreground">
                    {job.error_message ?? "No error recorded"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(job.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {job.status === "failed" || job.status === "cancelled" ? (
                        <>
                          <form action={retryJobAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={createIngestionHref(run.id, null)}
                            />
                            <Button type="submit" size="sm" variant="outline">
                              Retry
                            </Button>
                          </form>
                          <form action={deleteJobAction}>
                            <input type="hidden" name="jobId" value={job.id} />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={createIngestionHref(run.id, null)}
                            />
                            <Button type="submit" size="sm" variant="ghost">
                              Delete
                            </Button>
                          </form>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Tracking
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <PaginationControls
          page={jobPage}
          total={jobs.length}
          pageSize={PAGE_SIZE}
          onNext={() => setJobPage((currentPage) => currentPage + 1)}
          onPrevious={() =>
            setJobPage((currentPage) => Math.max(currentPage - 1, 1))
          }
        />
      </CardContent>
    </Card>
  )
}

function ItemOperationsTable({
  run,
  items,
  selectedItemId,
}: {
  run: CrawlRunSummary
  items: CrawlRunItemSummary[]
  selectedItemId: string
}) {
  const [itemPage, setItemPage] = useState(() => {
    const selectedIndex = items.findIndex((item) => item.id === selectedItemId)

    if (selectedIndex < 0) {
      return 1
    }

    return Math.floor(selectedIndex / PAGE_SIZE) + 1
  })

  if (items.length === 0) {
    return (
      <Empty className="min-h-0 border border-dashed bg-card/70 py-12">
        <EmptyHeader>
          <EmptyTitle>No items attached to this run yet</EmptyTitle>
          <EmptyDescription>
            The query exists, but no source items have been written back for it
            yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  const paginatedItems = items.slice(
    (itemPage - 1) * PAGE_SIZE,
    itemPage * PAGE_SIZE
  )

  return (
    <Card className="border-border/70 bg-card/85">
      <CardHeader>
        <CardTitle>Tracked items</CardTitle>
        <CardDescription>
          Each row is a durable item for this query. Errors stay visible with a
          retry or delete path.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Sync</TableHead>
              <TableHead>Files</TableHead>
              <TableHead>Error</TableHead>
              <TableHead className="w-[260px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => {
              const isSelected = item.id === selectedItemId

              return (
                <TableRow
                  key={item.id}
                  className={cn(isSelected ? "bg-primary/5" : undefined)}
                >
                  <TableCell>
                    <div className="space-y-1">
                      <Link
                        href={createIngestionHref(run.id, item.id)}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {item.external_id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <StatusBadge status={item.sync_status} />
                      <StatusBadge status={item.ingestion_status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      {item.download_stored_count}/{item.file_count} stored
                    </div>
                    <div className="text-muted-foreground">
                      {item.download_pending_count} pending,{" "}
                      {item.download_failed_count +
                        item.parse_failed_count +
                        item.embed_failed_count}{" "}
                      failing
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.latest_error_code ? (
                      <div className="space-y-2">
                        <Badge variant="destructive">
                          {item.latest_error_code}
                        </Badge>
                        <p className="max-w-md text-muted-foreground">
                          {item.latest_error_message ??
                            "No error message recorded."}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        No current error
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <form action={refreshSourceItemAction}>
                        <input
                          type="hidden"
                          name="sourceItemId"
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={createIngestionHref(run.id, item.id)}
                        />
                        <Button type="submit" variant="outline" size="sm">
                          Refresh
                        </Button>
                      </form>
                      <form action={reingestSourceItemAction}>
                        <input
                          type="hidden"
                          name="sourceItemId"
                          value={item.id}
                        />
                        <input
                          type="hidden"
                          name="forceDownload"
                          value="true"
                        />
                        <input
                          type="hidden"
                          name="redirectTo"
                          value={createIngestionHref(run.id, item.id)}
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          Rerun download
                        </Button>
                      </form>
                      {item.latest_error_job_id ? (
                        <>
                          <form action={retryJobAction}>
                            <input
                              type="hidden"
                              name="jobId"
                              value={item.latest_error_job_id}
                            />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={createIngestionHref(run.id, item.id)}
                            />
                            <Button type="submit" variant="outline" size="sm">
                              Retry error
                            </Button>
                          </form>
                          <form action={deleteJobAction}>
                            <input
                              type="hidden"
                              name="jobId"
                              value={item.latest_error_job_id}
                            />
                            <input
                              type="hidden"
                              name="redirectTo"
                              value={createIngestionHref(run.id, item.id)}
                            />
                            <Button type="submit" variant="ghost" size="sm">
                              Delete error
                            </Button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <PaginationControls
          page={itemPage}
          total={items.length}
          pageSize={PAGE_SIZE}
          onNext={() => setItemPage((currentPage) => currentPage + 1)}
          onPrevious={() =>
            setItemPage((currentPage) => Math.max(currentPage - 1, 1))
          }
        />
      </CardContent>
    </Card>
  )
}

function SelectedItemPanel({
  item,
  runId,
}: {
  item: CrawlRunItemSummary | null
  runId: string
}) {
  if (!item) {
    return (
      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle>Item detail</CardTitle>
          <CardDescription>
            Select an item row to focus the live view.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Focused item</Badge>
          <StatusBadge status={item.sync_status} />
          <StatusBadge status={item.ingestion_status} />
        </div>
        <CardTitle className="text-xl leading-tight">{item.title}</CardTitle>
        <CardDescription>
          External id {item.external_id}. Last updated{" "}
          {formatDateTime(item.updated_at)}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 px-4 py-3">
            <div className="text-muted-foreground">Files</div>
            <div className="mt-1 font-medium">
              {item.download_stored_count}/{item.file_count} stored
            </div>
          </div>
          <div className="rounded-lg border border-border/60 px-4 py-3">
            <div className="text-muted-foreground">Active jobs</div>
            <div className="mt-1 font-medium">{item.active_job_count}</div>
          </div>
        </div>

        {item.latest_error_code ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Current error</span>
              <Badge variant="destructive">{item.latest_error_code}</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">
              {item.latest_error_message ?? "No error message recorded."}
            </p>
          </div>
        ) : null}

        <Link
          href={createIngestionHref(runId, item.id)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Keep this item focused
        </Link>
      </CardContent>
    </Card>
  )
}

export function IngestionDashboard({
  actionError,
  actionMessage,
  initialDetail,
  initialRunPage,
  initialRunPagination,
  initialRuns,
  initialSelectedItemId,
}: IngestionDashboardProps) {
  const [detail, setDetail] = useState(initialDetail)
  const [runPage, setRunPage] = useState(initialRunPage)
  const [runPagination, setRunPagination] = useState(initialRunPagination)
  const [runs, setRuns] = useState(initialRuns)
  const [selectedItemId, setSelectedItemId] = useState(initialSelectedItemId)
  const [realtimeError, setRealtimeError] = useState<string | null>(null)

  const selectedRunId = detail?.run.id ?? runs[0]?.id ?? ""
  const selectedItem = getSelectedItem(detail, selectedItemId)

  const refreshDashboard = useEffectEvent(async () => {
    if (!selectedRunId) {
      return
    }

    try {
      const [runsResponse, nextDetail] = await Promise.all([
        listCrawlRuns({
          limit: PAGE_SIZE,
          page: runPage,
          sortBy: "updated_at",
          direction: "desc",
        }),
        getCrawlRunDetail(selectedRunId),
      ])

      startTransition(() => {
        setDetail(nextDetail)
        setRuns(
          mergeSelectedRunIntoHistory(
            runsResponse.runs,
            nextDetail?.run ?? null
          )
        )
        setRunPagination(runsResponse.pagination)
        setSelectedItemId((currentSelectedItemId) => {
          if (!nextDetail) {
            return ""
          }

          const nextSelectedItem = getSelectedItem(
            nextDetail,
            currentSelectedItemId
          )
          return nextSelectedItem?.id ?? ""
        })
        setRealtimeError(null)
      })
    } catch (error) {
      setRealtimeError(
        error instanceof Error ? error.message : "Live refresh failed."
      )
    }
  })

  const changeRunPage = useEffectEvent(async (nextPage: number) => {
    try {
      const runsResponse = await listCrawlRuns({
        limit: PAGE_SIZE,
        page: nextPage,
        sortBy: "updated_at",
        direction: "desc",
      })

      startTransition(() => {
        setRunPage(nextPage)
        setRuns(
          mergeSelectedRunIntoHistory(runsResponse.runs, detail?.run ?? null)
        )
        setRunPagination(runsResponse.pagination)
      })
    } catch (error) {
      setRealtimeError(
        error instanceof Error ? error.message : "Unable to load more runs."
      )
    }
  })

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-4">
      <div className="flex min-h-full w-full flex-col gap-6 py-6">
        <div className="flex items-center justify-between gap-4 px-0">
          <div className="px-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              Figshare operations
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              One page for query runs, live progress, item errors, and recovery
              actions.
            </p>
          </div>
          <IngestionLiveUpdates
            onRealtimeEvent={refreshDashboard}
            selectedRunId={detail?.run.id ?? null}
            selectedItemId={selectedItem?.id ?? null}
          />
        </div>

        {actionError ? <Notice message={actionError} variant="error" /> : null}
        {actionMessage ? (
          <Notice message={actionMessage} variant="success" />
        ) : null}
        {realtimeError ? (
          <Notice message={realtimeError} variant="error" />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-6">
            <StartRunCard />
            <RunHistory
              runs={runs}
              selectedRunId={selectedRunId}
              pagination={runPagination}
              onNextPage={() => changeRunPage(runPage + 1)}
              onPreviousPage={() => changeRunPage(Math.max(runPage - 1, 1))}
            />
          </div>

          <div className="space-y-6">
            {detail ? (
              <>
                <RunOverview detail={detail} selectedItem={selectedItem} />
                <RunJobActivity
                  key={detail.run.id}
                  run={detail.run}
                  jobs={detail.jobs}
                />
                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
                  <ItemOperationsTable
                    key={`${detail.run.id}:${selectedItem?.id ?? "none"}`}
                    run={detail.run}
                    items={detail.items}
                    selectedItemId={selectedItem?.id ?? ""}
                  />
                  <SelectedItemPanel
                    item={selectedItem}
                    runId={detail.run.id}
                  />
                </div>
              </>
            ) : (
              <Empty className="min-h-[420px] rounded-xl border border-dashed bg-card/60">
                <EmptyHeader>
                  <EmptyTitle>No crawl selected</EmptyTitle>
                  <EmptyDescription>
                    Start a query or select a prior run from the history column.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
