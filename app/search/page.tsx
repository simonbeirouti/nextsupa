import Link from "next/link"
import { connection } from "next/server"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"

import { SearchControls } from "@/app/search/_components/search-controls"
import {
  buildSearchHref,
  parseSearchState,
  type SearchParamInput,
} from "@/lib/figshare-search"
import {
  getFigshareArticleTypeLabel,
  getFigshareArticleUrl,
  getFigshareAuthorNames,
  getFigshareEmbedUrl,
  searchFigshareArticles,
  type FigshareArticle,
} from "@/lib/figshare"

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
})

type PageProps = {
  searchParams: Promise<SearchParamInput>
}

function getDoiUrl(doi?: string) {
  if (!doi) {
    return null
  }

  return doi.startsWith("http://") || doi.startsWith("https://")
    ? doi
    : `https://doi.org/${doi}`
}

function formatPublishedDate(publishedDate?: string | null) {
  if (!publishedDate) {
    return null
  }

  const date = new Date(publishedDate)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return dateFormatter.format(date)
}

function ResultsSummary({
  query,
  page,
  pageSize,
  results,
  hasMore,
}: {
  query: string
  page: number
  pageSize: number
  results: FigshareArticle[]
  hasMore: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <span>
        Showing {results.length} public result{results.length === 1 ? "" : "s"}{" "}
        for <span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>
      </span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
      <span>
        Page {page} with {pageSize} per page
      </span>
      <span aria-hidden="true" className="text-border">
        /
      </span>
      <span>{hasMore ? "More pages available" : "End of current results"}</span>
    </div>
  )
}

function ResultCard({
  article,
  isSelected,
  href,
}: {
  article: FigshareArticle
  isSelected: boolean
  href: string
}) {
  const authors = getFigshareAuthorNames(article)
  const publishedDate = formatPublishedDate(article.published_date)
  const articleUrl = getFigshareArticleUrl(article)
  const doiUrl = getDoiUrl(article.doi)

  return (
    <Card
      className={cn(
        "relative cursor-pointer overflow-hidden border border-border/70 bg-card/80 transition-colors",
        isSelected ? "ring-2 ring-primary/40" : "hover:bg-card"
      )}
    >
      <Link
        href={href}
        scroll={false}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">Preview {article.title}</span>
      </Link>

      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {getFigshareArticleTypeLabel(article.defined_type)}
          </Badge>
          {publishedDate ? <Badge variant="outline">{publishedDate}</Badge> : null}
          {isSelected ? <Badge>Previewing</Badge> : null}
        </div>

        <div className="space-y-2">
          <CardTitle className="pr-4 text-base leading-snug sm:text-lg">
            {article.title}
          </CardTitle>
          <CardDescription className="line-clamp-2">
            {authors.length > 0
              ? authors.join(", ")
              : "Author metadata not available in this search result."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
        {doiUrl ? (
          <a
            href={doiUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "relative z-20")}
          >
            DOI
          </a>
        ) : (
          <span className="text-muted-foreground">No DOI available</span>
        )}

        {articleUrl ? (
          <a
            href={articleUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative z-20")}
          >
            Open in Figshare
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}

function PreviewPane({ article }: { article: FigshareArticle }) {
  const articleUrl = getFigshareArticleUrl(article)
  const doiUrl = getDoiUrl(article.doi)
  const authors = getFigshareAuthorNames(article)
  const publishedDate = formatPublishedDate(article.published_date)

  return (
    <Card className="flex h-full min-h-0 flex-col border border-border/70 bg-card/85 shadow-sm backdrop-blur-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Live preview</Badge>
          <Badge variant="secondary">
            {getFigshareArticleTypeLabel(article.defined_type)}
          </Badge>
          {publishedDate ? <Badge variant="outline">{publishedDate}</Badge> : null}
        </div>

        <div className="space-y-2">
          <CardTitle className="text-xl leading-tight xl:text-2xl">
            {article.title}
          </CardTitle>
          <CardDescription className="leading-6">
            {authors.length > 0
              ? authors.join(", ")
              : "Author metadata not available in this search result."}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {articleUrl ? (
            <a
              href={articleUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Open source page
            </a>
          ) : null}

          {doiUrl ? (
            <a
              href={doiUrl}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Open DOI
            </a>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border bg-background/70">
          <iframe
            key={article.id}
            src={getFigshareEmbedUrl(article.id)}
            title={`Figshare preview for ${article.title}`}
            className="h-full min-h-0 w-full bg-background"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </CardContent>

      <CardFooter className="items-start text-xs leading-5 text-muted-foreground">
        The preview uses Figshare&apos;s embeddable widget. If a record does not
        render correctly in the frame, use the source-page link above.
      </CardFooter>
    </Card>
  )
}

export default async function SearchPage({ searchParams }: PageProps) {
  await connection()

  const state = parseSearchState(await searchParams)
  const controlsKey = [
    state.query,
    state.itemType,
    state.order,
    state.direction,
    state.pageSize,
    state.publishedSince,
  ].join("|")

  let results: FigshareArticle[] = []
  let hasMore = false
  let errorMessage: string | null = null

  if (state.query) {
    try {
      const response = await searchFigshareArticles(state.query, {
        page: state.page,
        pageSize: state.pageSize,
        itemType: state.itemType ? Number.parseInt(state.itemType, 10) : undefined,
        order: state.order,
        orderDirection: state.direction,
        publishedSince: state.publishedSince || undefined,
      })

      results = response.results
      hasMore = response.hasMore
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to search Figshare right now."
    }
  }

  const selectedArticle =
    results.find((article) => article.id === state.selectedArticleId) ??
    results[0] ??
    null

  const previousPageHref = buildSearchHref(
    {
      q: state.query,
      itemType: state.itemType,
      order: state.order,
      direction: state.direction,
      pageSize: state.pageSize,
      publishedSince: state.publishedSince,
      page: Math.max(1, state.page - 1),
      selected: null,
    },
    "/search"
  )

  const nextPageHref = buildSearchHref(
    {
      q: state.query,
      itemType: state.itemType,
      order: state.order,
      direction: state.direction,
      pageSize: state.pageSize,
      publishedSince: state.publishedSince,
      page: state.page + 1,
      selected: null,
    },
    "/search"
  )

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-4">
        <SearchControls key={controlsKey} state={state} />

        <Card className="flex min-h-0 flex-1 flex-col border border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {state.query && !errorMessage ? (
                <ResultsSummary
                  query={state.query}
                  page={state.page}
                  pageSize={state.pageSize}
                  results={results}
                  hasMore={hasMore}
                />
              ) : (
                <CardTitle>Results</CardTitle>
              )}

              {state.query ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={previousPageHref}
                    scroll={false}
                    aria-disabled={state.page <= 1}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      state.page <= 1 && "pointer-events-none opacity-50"
                    )}
                  >
                    Previous page
                  </Link>

                  <Link
                    href={nextPageHref}
                    scroll={false}
                    aria-disabled={!hasMore}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      !hasMore && "pointer-events-none opacity-50"
                    )}
                  >
                    Next page
                  </Link>
                </div>
              ) : null}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
            {errorMessage ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Search failed</CardTitle>
                  <CardDescription>{errorMessage}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            {!errorMessage && !state.query ? (
              <Empty className="h-full min-h-[16rem] border-border/70 bg-card/60 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <span className="text-sm font-medium">Q</span>
                  </EmptyMedia>
                  <EmptyTitle>Search is ready</EmptyTitle>
                  <EmptyDescription>
                    Start with a public query and the results list will stay here
                    while the selected record opens in the preview pane.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {!errorMessage && state.query && results.length === 0 ? (
              <Empty className="h-full min-h-[16rem] border-border/70 bg-card/60 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <span className="text-sm font-medium">0</span>
                  </EmptyMedia>
                  <EmptyTitle>No results matched that query</EmptyTitle>
                  <EmptyDescription>
                    Try a broader phrase, or use Figshare field search like
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      :title: climate
                    </code>
                    or
                    <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                      :tag: biology
                    </code>
                    .
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}

            {!errorMessage && results.length > 0 ? (
              <div className="grid gap-3">
                {results.map((article) => (
                  <ResultCard
                    key={article.id}
                    article={article}
                    isSelected={selectedArticle?.id === article.id}
                    href={buildSearchHref(
                      {
                        q: state.query,
                        itemType: state.itemType,
                        order: state.order,
                        direction: state.direction,
                        pageSize: state.pageSize,
                        publishedSince: state.publishedSince,
                        page: state.page,
                        selected: article.id,
                      },
                      "/search"
                    )}
                  />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="min-h-0">
        {selectedArticle ? (
          <PreviewPane article={selectedArticle} />
        ) : (
          <Empty className="h-full min-h-[24rem] border border-border/70 bg-card/60 py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <span className="text-sm font-medium">P</span>
              </EmptyMedia>
              <EmptyTitle>Select a result to preview it</EmptyTitle>
              <EmptyDescription>
                Every result card opens into this dedicated right-hand preview
                pane without leaving the search shell.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  )
}
