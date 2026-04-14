"use server"

import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect-error"

import {
  cancelCrawlRun,
  cancelJob,
  cancelSourceItemJobs,
  deleteCrawlRun,
  deleteJob,
  queueDownloadRecoveryInBulk,
  queueFigshareSearchSync,
  queueRefreshSourceItem,
  queueReingestSourceItem,
  retryJob,
  retryJobsInBulk,
  retrySourceItemSyncsInBulk,
} from "@/lib/ingestion"

function getSourceItemId(formData: FormData) {
  const sourceItemId = String(formData.get("sourceItemId") ?? "").trim()

  if (!sourceItemId) {
    throw new Error("A source item id is required.")
  }

  return sourceItemId
}

function getRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? "").trim()

  if (!value) {
    throw new Error(`${label} is required.`)
  }

  return value
}

function getRedirectTo(formData: FormData, fallback: string) {
  const redirectTo = String(formData.get("redirectTo") ?? "").trim()
  return redirectTo || fallback
}

function getBooleanValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim().toLowerCase()
  return value === "true" || value === "1" || value === "on"
}

function redirectWithActionError(redirectTo: string, error: unknown) {
  if (isRedirectError(error)) {
    throw error
  }

  const message =
    error instanceof Error ? error.message : "The requested action failed."
  const separator = redirectTo.includes("?") ? "&" : "?"
  redirect(
    `${redirectTo}${separator}actionError=${encodeURIComponent(message)}`
  )
}

function redirectWithActionMessage(redirectTo: string, message: string) {
  const separator = redirectTo.includes("?") ? "&" : "?"
  redirect(
    `${redirectTo}${separator}actionMessage=${encodeURIComponent(message)}`
  )
}

function formatRecoveryMessage(
  label: string,
  input: {
    queuedCount: number
    attemptedCount: number
    failedCount: number
  }
) {
  if (input.attemptedCount === 0) {
    return `${label}: no matching entries were available when this ran.`
  }

  const skippedCount = Math.max(
    input.attemptedCount - input.queuedCount - input.failedCount,
    0
  )
  let message = `${label}: found ${input.attemptedCount}, queued ${input.queuedCount}.`

  if (skippedCount > 0) {
    message += ` ${skippedCount} were already in progress or otherwise unchanged.`
  }

  if (input.failedCount > 0) {
    message += ` ${input.failedCount} entries could not be queued.`
  }

  return message
}

export async function refreshSourceItemAction(formData: FormData) {
  const sourceItemId = getSourceItemId(formData)
  const redirectTo = getRedirectTo(formData, `/ingestion?item=${sourceItemId}`)

  try {
    await queueRefreshSourceItem(sourceItemId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function queueFigshareSearchSyncAction(formData: FormData) {
  const query = getRequiredString(formData, "query", "Query")
  const redirectTo = getRedirectTo(formData, "/ingestion")
  const itemType = String(formData.get("itemType") ?? "").trim()
  const order = String(formData.get("order") ?? "").trim()
  const direction = String(formData.get("direction") ?? "").trim()
  const publishedSince = String(formData.get("publishedSince") ?? "").trim()

  try {
    const result = await queueFigshareSearchSync({
      query,
      itemType: itemType ? Number.parseInt(itemType, 10) : undefined,
      order: order || undefined,
      direction: direction === "asc" ? "asc" : "desc",
      publishedSince: publishedSince || undefined,
    })

    redirect(`/ingestion?run=${result.crawlRun.id}`)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }
}

export async function rerunCrawlRunAction(formData: FormData) {
  const query = getRequiredString(formData, "query", "Query")
  const redirectTo = getRedirectTo(formData, "/ingestion")
  const itemType = String(formData.get("itemType") ?? "").trim()
  const order = String(formData.get("order") ?? "").trim()
  const direction = String(formData.get("direction") ?? "").trim()
  const publishedSince = String(formData.get("publishedSince") ?? "").trim()

  try {
    const result = await queueFigshareSearchSync({
      query,
      itemType: itemType ? Number.parseInt(itemType, 10) : undefined,
      order: order || undefined,
      direction: direction === "asc" ? "asc" : "desc",
      publishedSince: publishedSince || undefined,
    })

    redirectWithActionMessage(
      `/ingestion?run=${result.crawlRun.id}`,
      `Started a fresh crawl for "${query}".`
    )
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }
}

export async function reingestSourceItemAction(formData: FormData) {
  const sourceItemId = getSourceItemId(formData)
  const redirectTo = getRedirectTo(formData, `/ingestion?item=${sourceItemId}`)
  const forceDownload = getBooleanValue(formData, "forceDownload")

  try {
    await queueReingestSourceItem(sourceItemId, {
      forceDownload,
    })
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  if (forceDownload) {
    redirectWithActionMessage(
      redirectTo,
      "Forced a full redownload for the selected item."
    )
  }

  redirect(redirectTo)
}

export async function cancelSourceItemJobsAction(formData: FormData) {
  const sourceItemId = getSourceItemId(formData)
  const redirectTo = getRedirectTo(formData, `/ingestion?item=${sourceItemId}`)

  try {
    await cancelSourceItemJobs(sourceItemId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function cancelCrawlRunAction(formData: FormData) {
  const crawlRunId = getRequiredString(formData, "crawlRunId", "Crawl run id")
  const redirectTo = getRedirectTo(formData, `/ingestion?run=${crawlRunId}`)

  try {
    await cancelCrawlRun(crawlRunId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function deleteCrawlRunAction(formData: FormData) {
  const crawlRunId = getRequiredString(formData, "crawlRunId", "Crawl run id")
  const redirectTo = getRedirectTo(formData, "/ingestion")

  try {
    await deleteCrawlRun(crawlRunId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function cancelJobAction(formData: FormData) {
  const jobId = getRequiredString(formData, "jobId", "Job id")
  const redirectTo = getRedirectTo(formData, "/ingestion")

  try {
    await cancelJob(jobId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function deleteJobAction(formData: FormData) {
  const jobId = getRequiredString(formData, "jobId", "Job id")
  const redirectTo = getRedirectTo(formData, "/ingestion")

  try {
    await deleteJob(jobId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function retryJobAction(formData: FormData) {
  const jobId = getRequiredString(formData, "jobId", "Job id")
  const redirectTo = getRedirectTo(formData, "/ingestion")

  try {
    await retryJob(jobId)
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}

export async function runRecoveryAction(formData: FormData) {
  const scope = getRequiredString(formData, "scope", "Recovery scope")
  const redirectTo = getRedirectTo(formData, "/ingestion")

  try {
    switch (scope) {
      case "full_sweep": {
        const syncResult = await retrySourceItemSyncsInBulk({
          syncStatuses: ["failed", "cancelled"],
        })
        const downloadResult = await queueDownloadRecoveryInBulk()
        const jobResult = await retryJobsInBulk({
          statuses: ["failed", "cancelled"],
          jobTypes: ["sync_source_items", "download_file"],
        })
        const failedCount =
          syncResult.failed_count +
          downloadResult.failed_count +
          jobResult.failed_count
        let message = `Recovery sweep found ${syncResult.attempted_count} syncs, ${downloadResult.attempted_count} download recoveries, and ${jobResult.attempted_count} retryable jobs. Queued ${syncResult.queued_count}, ${downloadResult.queued_count}, and ${jobResult.queued_count} respectively.`

        if (failedCount > 0) {
          message += ` ${failedCount} entries could not be queued.`
        }

        redirectWithActionMessage(
          redirectTo,
          message
        )
        break
      }
      case "syncs": {
        const result = await retrySourceItemSyncsInBulk({
          syncStatuses: ["failed", "cancelled"],
        })
        redirectWithActionMessage(
          redirectTo,
          formatRecoveryMessage("Sync recovery", {
            queuedCount: result.queued_count,
            attemptedCount: result.attempted_count,
            failedCount: result.failed_count,
          })
        )
        break
      }
      case "downloads": {
        const result = await queueDownloadRecoveryInBulk()
        redirectWithActionMessage(
          redirectTo,
          formatRecoveryMessage("Download recovery", {
            queuedCount: result.queued_count,
            attemptedCount: result.attempted_count,
            failedCount: result.failed_count,
          })
        )
        break
      }
      default:
        throw new Error(`Unsupported recovery scope: ${scope}`)
    }
  } catch (error) {
    redirectWithActionError(redirectTo, error)
  }

  redirect(redirectTo)
}
