import { fetchBackendJson, postBackendJson } from "@/lib/backend"

export type SourceSummary = {
  id: string
  key: string
  name: string
  status: string
  created_at: string
  updated_at: string
  source_item_count: number
  pending_job_count: number
  synced_item_count: number
}

export type SourceItemSummary = {
  id: string
  source_id: string
  source_config_id: string | null
  external_id: string
  external_version_id: string | null
  title: string
  doi: string | null
  url: string | null
  published_at: string | null
  modified_at: string | null
  item_type: string | null
  ingestion_status: string
  sync_status: string
  raw_metadata: unknown
  last_seen_at: string
  created_at: string
  updated_at: string
  file_count: number
  source_key: string
}

export type SourceFileRecord = {
  id: string
  source_item_id: string
  external_file_id: string
  filename: string
  mime_type: string | null
  extension: string | null
  size_bytes: number | null
  source_url: string | null
  storage_path: string | null
  download_status: string
  parse_status: string
  embed_status: string
  raw_metadata: unknown
  created_at: string
  updated_at: string
}

export type MissingStorageFileRecord = SourceFileRecord & {
  source_item_title: string
  source_item_external_id: string
  source_key: string
}

export type IngestionJobRecord = {
  id: string
  job_type: string
  source_item_id: string | null
  source_file_id: string | null
  status: string
  stage: string
  priority: number
  attempt_count: number
  max_attempts: number
  lease_expires_at: string | null
  run_after: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  payload: unknown
  result: unknown
  created_at: string
  updated_at: string
}

export type CrawlCheckpointRecord = {
  checkpoint_key: string
  checkpoint_value: unknown
  id: string
  source_config_id: string | null
  source_id: string
  updated_at: string
}

export type CrawlRunSummary = {
  id: string
  source_id: string
  source_config_id: string | null
  run_type: string
  status: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  stats: unknown
  created_at: string
  updated_at: string
  query: string | null
  pages_processed: number
  discovered_items: number
  refresh_jobs_queued: number
  related_job_count: number
  related_job_completed_count: number
  related_job_failed_count: number
  related_job_cancelled_count: number
  related_job_terminal_count: number
}

export type CrawlRunItemSummary = SourceItemSummary & {
  active_job_count: number
  completed_job_count: number
  failed_job_count: number
  cancelled_job_count: number
  download_pending_count: number
  download_stored_count: number
  download_failed_count: number
  parse_failed_count: number
  embed_failed_count: number
  latest_error_code: string | null
  latest_error_message: string | null
  latest_error_job_id: string | null
  latest_error_job_type: string | null
}

export type SourceItemDetail = {
  item: SourceItemSummary
  files: SourceFileRecord[]
  jobs: IngestionJobRecord[]
}

export type CrawlRunDetail = {
  run: CrawlRunSummary
  checkpoint: CrawlCheckpointRecord | null
  jobs: IngestionJobRecord[]
  items: CrawlRunItemSummary[]
}

type SourcesResponse = {
  sources: SourceSummary[]
}

export type PaginationMeta = {
  total: number
  page: number
  limit: number
}

type SourceItemsResponse = {
  items: SourceItemSummary[]
  pagination: PaginationMeta
}

type MissingStorageFilesResponse = {
  files: MissingStorageFileRecord[]
  pagination: PaginationMeta
}

type JobsResponse = {
  jobs: IngestionJobRecord[]
  pagination: PaginationMeta
}

type CrawlRunsResponse = {
  runs: CrawlRunSummary[]
  pagination: PaginationMeta
}

type JobResponse = {
  job: IngestionJobRecord
}

type QueueSearchSyncResponse = {
  crawlRun: CrawlRunSummary
  job: IngestionJobRecord
}

type QueueSourceItemJobResponse = {
  item: SourceItemSummary
  job: IngestionJobRecord
}

type CancelSourceItemJobsResponse = {
  item: SourceItemSummary
  jobs: IngestionJobRecord[]
}

type CancelCrawlRunResponse = {
  run: CrawlRunSummary
  cancelledJobs: IngestionJobRecord[]
}

type DeleteCrawlRunResponse = {
  run: CrawlRunSummary
  deletedJobCount: number
}

type ImportFigshareArticleResponse = {
  sourceItem: SourceItemSummary
  job: IngestionJobRecord
}

export type BulkRecoveryResponse = {
  attempted_count: number
  queued_count: number
  failed_count: number
  errors: Array<{
    id: string
    message: string
  }>
}

type DownloadRecoverySummaryResponse = {
  affected_item_count: number
}

export async function listSources() {
  const response = await fetchBackendJson<SourcesResponse>("/api/v1/sources")
  return response.sources
}

export async function listSourceItems(input: {
  limit?: number
  page?: number
  syncStatus?: string
  syncStatuses?: string[]
  ingestionStatus?: string
  ingestionStatuses?: string[]
  sortBy?: "updated_at" | "created_at" | "published_at" | "title"
  direction?: "asc" | "desc"
} = {}) {
  const params = new URLSearchParams()
  params.set("limit", String(input.limit ?? 10))
  params.set("page", String(input.page ?? 1))
  params.set("direction", input.direction ?? "desc")

  if (input.sortBy) {
    params.set("sortBy", input.sortBy)
  }

  if (input.syncStatus) {
    params.set("syncStatus", input.syncStatus)
  }

  for (const syncStatus of input.syncStatuses ?? []) {
    params.append("syncStatuses", syncStatus)
  }

  if (input.ingestionStatus) {
    params.set("ingestionStatus", input.ingestionStatus)
  }

  for (const ingestionStatus of input.ingestionStatuses ?? []) {
    params.append("ingestionStatuses", ingestionStatus)
  }

  const response = await fetchBackendJson<SourceItemsResponse>(
    `/api/v1/source-items?${params.toString()}`
  )
  return response
}

export async function getSourceItemDetail(sourceItemId: string) {
  return fetchBackendJson<SourceItemDetail>(
    `/api/v1/source-items/${sourceItemId}`
  )
}

export async function listJobs(input: {
  limit?: number
  page?: number
  sortBy?: "created_at" | "updated_at" | "status" | "job_type"
  direction?: "asc" | "desc"
  status?: string
  statuses?: string[]
  jobType?: string
  jobTypes?: string[]
  crawlRunId?: string
} = {}) {
  const params = new URLSearchParams()
  params.set("limit", String(input.limit ?? 10))
  params.set("page", String(input.page ?? 1))
  params.set("direction", input.direction ?? "desc")

  if (input.sortBy) {
    params.set("sortBy", input.sortBy)
  }

  if (input.status) {
    params.set("status", input.status)
  }

  for (const status of input.statuses ?? []) {
    params.append("statuses", status)
  }

  if (input.jobType) {
    params.set("jobType", input.jobType)
  }

  for (const jobType of input.jobTypes ?? []) {
    params.append("jobTypes", jobType)
  }

  if (input.crawlRunId) {
    params.set("crawlRunId", input.crawlRunId)
  }

  const response = await fetchBackendJson<JobsResponse>(`/api/v1/jobs?${params.toString()}`)
  return response
}

export async function listCrawlRuns(input: {
  limit?: number
  page?: number
  sortBy?: "created_at" | "updated_at" | "status"
  direction?: "asc" | "desc"
  status?: string
} = {}) {
  const params = new URLSearchParams()
  params.set("limit", String(input.limit ?? 10))
  params.set("page", String(input.page ?? 1))
  params.set("direction", input.direction ?? "desc")

  if (input.sortBy) {
    params.set("sortBy", input.sortBy)
  }

  if (input.status) {
    params.set("status", input.status)
  }

  const response = await fetchBackendJson<CrawlRunsResponse>(
    `/api/v1/crawl-runs?${params.toString()}`
  )
  return response
}

export async function getCrawlRunDetail(crawlRunId: string) {
  return fetchBackendJson<CrawlRunDetail>(`/api/v1/crawl-runs/${crawlRunId}`)
}

export async function getJob(jobId: string) {
  const response = await fetchBackendJson<JobResponse>(`/api/v1/jobs/${jobId}`)
  return response.job
}

export async function importFigshareArticle(articleId: number) {
  return postBackendJson<ImportFigshareArticleResponse>(
    "/api/v1/figshare/import",
    {
      articleId,
    }
  )
}

export async function queueFigshareSearchSync(input: {
  query: string
  itemType?: number
  order?: string
  direction?: "asc" | "desc"
  publishedSince?: string
}) {
  return postBackendJson<QueueSearchSyncResponse>("/api/v1/figshare/sync", {
    query: input.query,
    itemType: input.itemType,
    order: input.order,
    direction: input.direction,
    publishedSince: input.publishedSince,
  })
}

export async function queueRefreshSourceItem(sourceItemId: string) {
  return postBackendJson<QueueSourceItemJobResponse>(
    `/api/v1/source-items/${sourceItemId}/refresh`
  )
}

export async function queueReingestSourceItem(
  sourceItemId: string,
  input: {
    forceDownload?: boolean
  } = {}
) {
  return postBackendJson<QueueSourceItemJobResponse>(
    `/api/v1/source-items/${sourceItemId}/reingest`,
    input
  )
}

export async function retrySourceItemSyncsInBulk(input: {
  syncStatuses?: string[]
} = {}) {
  return postBackendJson<BulkRecoveryResponse>(
    "/api/v1/source-items/retry-syncs-bulk",
    input
  )
}

export async function queueDownloadRecoveryInBulk() {
  return postBackendJson<BulkRecoveryResponse>(
    "/api/v1/source-items/reingest-download-issues-bulk"
  )
}

export async function getDownloadRecoverySummary() {
  return fetchBackendJson<DownloadRecoverySummaryResponse>(
    "/api/v1/source-items/download-issues/summary"
  )
}

export async function listMissingStorageFiles(input: {
  limit?: number
  page?: number
} = {}) {
  const params = new URLSearchParams()
  params.set("limit", String(input.limit ?? 10))
  params.set("page", String(input.page ?? 1))

  return fetchBackendJson<MissingStorageFilesResponse>(
    `/api/v1/source-items/missing-storage-files?${params.toString()}`
  )
}

export async function cancelSourceItemJobs(sourceItemId: string) {
  return postBackendJson<CancelSourceItemJobsResponse>(
    `/api/v1/source-items/${sourceItemId}/cancel`
  )
}

export async function cancelCrawlRun(crawlRunId: string) {
  return postBackendJson<CancelCrawlRunResponse>(
    `/api/v1/crawl-runs/${crawlRunId}/cancel`
  )
}

export async function deleteCrawlRun(crawlRunId: string) {
  return fetchBackendJson<DeleteCrawlRunResponse>(`/api/v1/crawl-runs/${crawlRunId}`, {
    method: "DELETE",
  })
}

export async function cancelJob(jobId: string) {
  return postBackendJson<JobResponse>(`/api/v1/jobs/${jobId}/cancel`)
}

export async function retryJob(jobId: string) {
  return postBackendJson<JobResponse>(`/api/v1/jobs/${jobId}/retry`)
}

export async function retryJobsInBulk(input: {
  statuses?: string[]
  jobTypes?: string[]
} = {}) {
  return postBackendJson<BulkRecoveryResponse>("/api/v1/jobs/retry-bulk", input)
}

export async function deleteJob(jobId: string) {
  return fetchBackendJson<JobResponse>(`/api/v1/jobs/${jobId}`, {
    method: "DELETE",
  })
}
