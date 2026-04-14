import { fetchBackendJson } from "@/lib/backend"

const FIGSHARE_ITEM_TYPE_LABELS: Record<number, string> = {
  1: "Figure",
  2: "Media",
  3: "Dataset",
  5: "Poster",
  6: "Journal contribution",
  7: "Presentation",
  8: "Thesis",
  9: "Software",
  11: "Online resource",
  12: "Preprint",
  13: "Book",
  14: "Conference contribution",
  15: "Chapter",
  16: "Peer review",
  17: "Educational resource",
  18: "Report",
  19: "Standard",
  20: "Composition",
  21: "Funding",
  22: "Physical object",
  23: "Data management plan",
  24: "Workflow",
  25: "Monograph",
  26: "Performance",
  27: "Event",
  28: "Service",
  29: "Model",
}

type FigshareAuthor = {
  full_name?: string
  name?: string
}

export type FigshareArticle = {
  id: number
  title: string
  doi?: string
  defined_type?: number
  published_date?: string | null
  url?: string
  url_public_html?: string
  figshare_url?: string
  thumb?: string
  authors?: FigshareAuthor[]
}

export type FigshareSearchOptions = {
  page?: number
  pageSize?: number
  itemType?: number
  order?:
    | "published_date"
    | "created_date"
    | "modified_date"
    | "views"
    | "shares"
    | "downloads"
    | "cites"
  orderDirection?: "asc" | "desc"
  publishedSince?: string
}

type FigshareSearchResponse = {
  results: FigshareArticle[]
  hasMore: boolean
}

export function getFigshareArticleUrl(article: FigshareArticle) {
  return article.url_public_html ?? article.figshare_url ?? article.url ?? null
}

export function getFigshareEmbedUrl(articleId: number) {
  return `https://widgets.figshare.com/articles/${articleId}/embed?show_title=1`
}

export function getFigshareArticleTypeLabel(definedType?: number) {
  if (!definedType) {
    return "Research item"
  }

  return FIGSHARE_ITEM_TYPE_LABELS[definedType] ?? `Item type ${definedType}`
}

export function getFigshareAuthorNames(article: FigshareArticle) {
  return (
    article.authors
      ?.map((author) => author.full_name ?? author.name ?? null)
      .filter((authorName): authorName is string => Boolean(authorName)) ?? []
  )
}

export async function searchFigshareArticles(
  query: string,
  options: FigshareSearchOptions = {}
) {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return {
      results: [] as FigshareArticle[],
      hasMore: false,
    }
  }

  const params = new URLSearchParams({
    query: normalizedQuery,
    page: String(options.page ?? 1),
    pageSize: String(options.pageSize ?? 20),
    order: options.order ?? "published_date",
    direction: options.orderDirection ?? "desc",
  })

  if (options.itemType) {
    params.set("itemType", String(options.itemType))
  }

  if (options.publishedSince) {
    params.set("publishedSince", options.publishedSince)
  }

  return fetchBackendJson<FigshareSearchResponse>(
    `/api/v1/figshare/search?${params.toString()}`
  )
}
