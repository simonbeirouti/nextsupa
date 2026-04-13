"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import { Badge } from "@workspace/ui/components/badge"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

import {
  buildSearchHref,
  EXAMPLE_QUERIES,
  ITEM_TYPE_OPTIONS,
  ORDER_DIRECTION_OPTIONS,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
  type SearchState,
} from "@/lib/figshare-search"

type SearchControlsProps = {
  state: SearchState
}

export function SearchControls({ state }: SearchControlsProps) {
  const pathname = usePathname() || "/search"
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const nextQuery = String(formData.get("q") ?? "").trim()

    const href = buildSearchHref(
      {
        q: nextQuery,
        page: nextQuery ? 1 : null,
        pageSize: String(formData.get("pageSize") ?? ""),
        itemType: String(formData.get("itemType") ?? ""),
        order: String(formData.get("order") ?? ""),
        direction: String(formData.get("direction") ?? ""),
        publishedSince: String(formData.get("publishedSince") ?? ""),
        selected: null,
      },
      pathname
    )

    startTransition(() => {
      router.push(href, { scroll: false })
    })
  }

  return (
    <Card className="border border-border/70 bg-card/85 shadow-sm backdrop-blur-sm">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit">
              FigJam Search
            </Badge>
            <CardTitle className="text-2xl leading-tight">
              Search, filter, and preview Figshare records
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6">
              Results stay on the left, the selected record stays on the right,
              and route transitions stay inside this shell.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((exampleQuery) => (
              <Link
                key={exampleQuery}
                href={buildSearchHref({ q: exampleQuery }, pathname)}
                scroll={false}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-full"
                )}
              >
                {exampleQuery}
              </Link>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4" role="search">
          <label htmlFor="q" className="space-y-2">
            <span className="text-sm font-medium">Query</span>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={state.query}
              placeholder="Try climate change, :tag: genomics, or :title: machine learning"
              className="h-11 rounded-xl bg-background/80 px-4 text-sm"
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium">Item type</span>
              <NativeSelect
                name="itemType"
                defaultValue={state.itemType}
                className="w-full"
              >
                {ITEM_TYPE_OPTIONS.map((option) => (
                  <NativeSelectOption
                    key={option.value || "all"}
                    value={option.value}
                  >
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Sort by</span>
              <NativeSelect
                name="order"
                defaultValue={state.order}
                className="w-full"
              >
                {SORT_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Direction</span>
              <NativeSelect
                name="direction"
                defaultValue={state.direction}
                className="w-full"
              >
                {ORDER_DIRECTION_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Per page</span>
              <NativeSelect
                name="pageSize"
                defaultValue={String(state.pageSize)}
                className="w-full"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option} value={String(option)}>
                    {option} results
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">Published since</span>
              <Input
                name="publishedSince"
                type="date"
                defaultValue={state.publishedSince}
                className="h-8 rounded-lg bg-background/80 px-3 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" className="rounded-xl px-5" disabled={isPending}>
              {isPending ? <Spinner className="size-4" /> : null}
              {isPending ? "Updating" : "Apply filters"}
            </Button>

            <Link
              href={pathname}
              scroll={false}
              className={cn(buttonVariants({ variant: "ghost" }), "rounded-xl px-5")}
            >
              Reset
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
