const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

const SORT_OPTIONS = [
  { value: "published_date", label: "Published date" },
  { value: "modified_date", label: "Modified date" },
  { value: "views", label: "Views" },
  { value: "shares", label: "Shares" },
  { value: "downloads", label: "Downloads" },
  { value: "cites", label: "Citations" },
] as const

const ITEM_TYPE_OPTIONS = [
  { value: "", label: "All item types" },
  { value: "3", label: "Datasets" },
  { value: "1", label: "Figures" },
  { value: "9", label: "Software" },
  { value: "12", label: "Preprints" },
  { value: "18", label: "Reports" },
  { value: "7", label: "Presentations" },
] as const

const ORDER_DIRECTION_OPTIONS = [
  { value: "desc", label: "Newest first" },
  { value: "asc", label: "Oldest first" },
] as const

const EXAMPLE_QUERIES = [
  "climate change",
  ":title: machine learning",
  ":tag: genomics",
]

export type SearchParamInput = {
  q?: string | string[]
  page?: string | string[]
  pageSize?: string | string[]
  itemType?: string | string[]
  order?: string | string[]
  direction?: string | string[]
  publishedSince?: string | string[]
  selected?: string | string[]
}

export type SearchState = {
  query: string
  page: number
  pageSize: (typeof PAGE_SIZE_OPTIONS)[number]
  itemType: string
  order: (typeof SORT_OPTIONS)[number]["value"]
  direction: (typeof ORDER_DIRECTION_OPTIONS)[number]["value"]
  publishedSince: string
  selectedArticleId: number | null
}

export {
  EXAMPLE_QUERIES,
  ITEM_TYPE_OPTIONS,
  ORDER_DIRECTION_OPTIONS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
}

function getSingleParamValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

function getPageSize(value: string) {
  const parsed = parsePositiveInt(value, 20)

  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    ? (parsed as (typeof PAGE_SIZE_OPTIONS)[number])
    : 20
}

function getOrder(value: string): (typeof SORT_OPTIONS)[number]["value"] {
  return (
    SORT_OPTIONS.find((option) => option.value === value)?.value ??
    "published_date"
  )
}

function getOrderDirection(
  value: string
): (typeof ORDER_DIRECTION_OPTIONS)[number]["value"] {
  return value === "asc" ? "asc" : "desc"
}

function getSelectedArticleId(value: string) {
  const parsed = Number.parseInt(value, 10)

  return Number.isFinite(parsed) ? parsed : null
}

export function parseSearchState(searchParams: SearchParamInput): SearchState {
  return {
    query: getSingleParamValue(searchParams.q).trim(),
    page: parsePositiveInt(getSingleParamValue(searchParams.page), 1),
    pageSize: getPageSize(getSingleParamValue(searchParams.pageSize)),
    itemType: getSingleParamValue(searchParams.itemType),
    order: getOrder(getSingleParamValue(searchParams.order)),
    direction: getOrderDirection(getSingleParamValue(searchParams.direction)),
    publishedSince: getSingleParamValue(searchParams.publishedSince),
    selectedArticleId: getSelectedArticleId(
      getSingleParamValue(searchParams.selected)
    ),
  }
}

export function buildSearchHref(
  values: Record<string, string | number | null | undefined>,
  pathname = "/search"
) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") {
      continue
    }

    params.set(key, String(value))
  }

  const queryString = params.toString()

  return queryString ? `${pathname}?${queryString}` : pathname
}
