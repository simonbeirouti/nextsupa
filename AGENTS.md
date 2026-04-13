# AGENTS

This file applies to `apps/figjam` and extends the shared monorepo guidance in
`/Users/besi/Developer/Compound/site/AGENTS.md`. Apply this file first for
figjam work, then inherit relevant root guidance.

## Scope

- `apps/figjam` is the Next.js research UI for source search, ingestion
  selection, retrieval, and reporting workflows.
- It should remain a frontend application that talks to `apps/backend` over
  HTTP.

## Local Priorities

- Keep source synchronization, parsing, embeddings, and ingestion state in the
  backend.
- Focus the frontend on search, selection, preview, retrieval UX, and reporting
  surfaces.
- Preserve a responsive, route-driven UI with minimal loading flashes.

## Skills To Use Here

These are the root-locked skills that are a strong fit for `apps/figjam`.

### `vercel-react-best-practices`

Use this for:

- Next.js route components
- split-pane interfaces
- loading boundaries
- rendering-heavy interactive shells

Why it applies here:

- `apps/figjam` is a Next.js app and should follow strong React and Next
  performance patterns.

### `react-useeffect`

Use this for:

- effect cleanup
- prop/state synchronization
- client interactions that risk stale or unnecessary effects

Why it applies here:

- search controls, preview shells, and client state should stay simple and
  predictable.

### `figshare`

Use this when touching:

- Figshare-specific UI flows
- query shapes
- result presentation tied to Figshare metadata

Why it applies here:

- Figshare is the first source exposed through the FigJam frontend and should
  stay aligned with the backend connector.

## FigJam-Specific Rules

- Do not move backend ingestion logic into this app.
- Do not use backend-only retrieval, parsing, or workflow skills here unless
  the task explicitly crosses into `apps/backend`.
- Prefer backend APIs over direct source access.
- Keep URL state meaningful for search, selection, and preview flows.
- Use loading and layout boundaries to reduce navigation flashes.

## Repository Note

Update this file if FigJam adds new source-specific UI flows or frontend skills
that should be preferred locally.
