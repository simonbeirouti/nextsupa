"use server"

import { redirect } from "next/navigation"

import { importFigshareArticle, queueFigshareSearchSync } from "@/lib/ingestion"

export async function importFigshareArticleAction(formData: FormData) {
  const articleId = Number.parseInt(String(formData.get("articleId") ?? ""), 10)

  if (!Number.isFinite(articleId) || articleId < 1) {
    throw new Error("A valid Figshare article id is required.")
  }

  const result = await importFigshareArticle(articleId)

  redirect(`/ingestion?item=${result.sourceItem.id}`)
}

export async function queueFigshareSearchSyncAction(formData: FormData) {
  const query = String(formData.get("query") ?? "").trim()

  if (!query) {
    throw new Error("A search query is required.")
  }

  const itemType = String(formData.get("itemType") ?? "").trim()
  const order = String(formData.get("order") ?? "").trim()
  const direction = String(formData.get("direction") ?? "").trim()
  const publishedSince = String(formData.get("publishedSince") ?? "").trim()

  const result = await queueFigshareSearchSync({
    query,
    itemType: itemType ? Number.parseInt(itemType, 10) : undefined,
    order: order || undefined,
    direction: direction === "asc" ? "asc" : "desc",
    publishedSince: publishedSince || undefined,
  })

  redirect(`/ingestion?run=${result.crawlRun.id}`)
}
