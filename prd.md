# PRD: FigJam Frontend App

## 1. Executive Summary

**FigJam** is the researcher-facing web app for discovering academic sources, selecting materials for ingestion, asking evidence-based questions, and assembling report outputs from verified results.

It is a **Next.js frontend** that integrates with the dedicated backend platform in `apps/backend`. FigJam owns the user experience, route structure, session flows, and presentation of retrieval results. It does **not** own source synchronization, file parsing, embeddings, vector storage, or ingestion orchestration.

---

## 2. Product Goal

Build a frontend application that lets researchers:

1. search and browse Figshare-backed content through backend APIs
2. turn a topic search into a long-running ingestion run across all matching records
3. inspect ingestion and retrieval state without needing backend knowledge
4. ask questions against imported material after it has been processed into vectors
5. save useful outputs into a report-oriented workflow

---

## 3. Problem Statement

The current FigJam prototype proves that basic search works, but the frontend PRD is still framed as if the app owns ingestion, parsing, vectorization, and agent orchestration.

That creates the wrong product boundary.

The frontend should instead optimize for:

- clear search and selection flows
- clear topic-ingestion initiation flows
- predictable route-driven research workflows
- transparent source and citation inspection
- responsive session state across search, chat, and reporting
- stable integration with backend APIs that own processing

Without that separation, the app risks duplicating backend responsibilities, leaking infrastructure concerns into UI code, and making future source expansion harder.

---

## 4. Goals

### Primary Goals

- Position FigJam as the dedicated frontend for the research workflow
- Provide a strong search and selection UX for Figshare-backed content
- Let a researcher search for a topic and start ingestion for the full matching corpus
- Expose ingestion and retrieval progress in researcher-friendly terms
- Support citation-aware chat and source inspection
- Support report assembly and export initiation from saved outputs

### Secondary Goals

- Keep URL state meaningful for search, selection, and workspace views
- Reduce loading flashes between major workflow steps
- Make backend status legible without exposing backend internals
- Create a frontend architecture that can support future sources beyond Figshare

---

## 5. Non-Goals

These are explicitly out of scope for the frontend app:

- direct Figshare API ownership in the browser
- source synchronization logic
- file downloading and storage pipelines
- document parsing or OCR
- chunking and embeddings
- vector database management
- job processing and retry orchestration
- backend citation verification implementation details

Those responsibilities belong in `apps/backend`.

---

## 6. Users and Core Jobs

### Primary Users

- researchers building a private evidence base from academic sources
- internal users evaluating ingestion quality and retrieval behavior

### Core Jobs To Be Done

- find relevant source material quickly
- understand what has or has not been crawled, imported, downloaded, parsed, or embedded
- explore source details before committing to ingestion
- ask questions and trace answers back to source evidence after ingestion is ready
- collect useful findings into a shareable report draft

---

## 7. Product Principles

### 7.1 Frontend Owns Workflow Clarity

The app should make search, selection, chat, and reporting feel like one coherent workflow.

### 7.2 Backend Owns Processing

The frontend must treat ingestion, parsing, embeddings, and retrieval preparation as backend capabilities exposed over HTTP.

### 7.3 Citation Trust Is Visible

Users should be able to inspect where an answer came from without leaving the workspace.

### 7.4 URL State Matters

Search query, selected items, and workspace context should be shareable and recoverable where appropriate.

### 7.5 Status Should Be Understandable

Backend states must be translated into clear UI language such as imported, processing, ready, failed, or needs attention.

---

## 8. Frontend Scope

### 8.1 Search and Discovery

The app should provide:

- search input and filtering for Figshare-backed content
- result lists with title, authors, DOI, publication details, and file availability
- item detail or preview surfaces before import
- selection controls for one or many source items

### 8.2 Import and Workspace Entry

The app should provide:

- explicit import actions that call backend import endpoints
- a topic-ingestion action that can enqueue all matching search results
- progress and status messaging after import is requested
- a clear transition from discovery into the research workspace

### 8.3 Research Workspace

The app should provide:

- a workspace for asking questions against ingested and vectorized material
- conversation history tied to the active research context
- citation-aware responses
- filters or scoping controls when multiple imported sources exist

### 8.4 Source Inspector

The app should provide:

- citation click targets in responses
- a side panel, drawer, or split-pane inspector for source evidence
- metadata display including title, DOI, authors, source URL, and excerpt context

### 8.5 Reporting Surface

The app should provide:

- a way to save or accept useful findings from the workspace
- a report builder state that aggregates saved outputs
- a references view sourced from cited materials
- export initiation and export status display

---

## 9. Integration Boundary With `apps/backend`

FigJam should integrate with backend APIs for all domain operations.

The frontend may use Next.js server components, route handlers, or server actions as thin integration layers, but those layers must not become a second backend.

### Backend-Owned Responsibilities

- source search execution against upstream providers
- item import and synchronization
- ingestion job creation and status transitions
- raw file handling and parsing
- chunking, embeddings, and vector retrieval
- chat orchestration and citation verification
- report export generation if implemented server-side

### Frontend-Owned Responsibilities

- route composition
- search form UX
- result rendering and item preview
- selection and import initiation UX
- workspace composition
- citation inspector presentation
- saved findings and report assembly UI
- optimistic, loading, empty, and error states

---

## 10. Expected API Integrations

The frontend should be designed around backend endpoints such as:

- `GET /api/v1/figshare/search`
- `POST /api/v1/figshare/import`
- `POST /api/v1/figshare/sync`
- `GET /api/v1/crawl-runs`
- `GET /api/v1/crawl-runs/:id`
- `GET /api/v1/source-items`
- `GET /api/v1/source-items/:id`
- `GET /api/v1/jobs/:id`
- `POST /api/v1/search/vector`
- `POST /api/v1/chat`

The exact response shapes may evolve, but the frontend should assume:

- search returns normalized source item summaries
- topic sync returns a durable crawl run reference such as crawl-run IDs or job IDs
- item detail returns normalized metadata and file information
- import returns a durable backend reference such as item IDs or job IDs
- chat returns answer content plus citation metadata suitable for inline linking
- long-running operations may require polling or refresh-based status checks

---

## 11. Functional Requirements

| ID        | Requirement                                                                        | Priority | Integration                                             |
| :-------- | :--------------------------------------------------------------------------------- | :------- | :------------------------------------------------------ |
| **FR-1**  | Search Figshare-backed records through backend APIs.                               | P0       | `GET /api/v1/figshare/search`                           |
| **FR-2**  | Preview source metadata before import.                                             | P0       | `GET /api/v1/source-items/:id` or search detail payload |
| **FR-3**  | Start a topic-level ingestion run for all matching records.                        | P0       | `POST /api/v1/figshare/sync`                            |
| **FR-4**  | Select one or many records and request targeted import.                            | P0       | `POST /api/v1/figshare/import`                          |
| **FR-5**  | Display crawl, import, and ingestion state in clear UI terms.                      | P0       | crawl run + source item + job status endpoints          |
| **FR-6**  | Support multi-turn chat within a chosen research context after ingestion is ready. | P1       | `POST /api/v1/chat`                                     |
| **FR-7**  | Render inline citations and open a source inspector.                               | P1       | citation metadata from chat/retrieval APIs              |
| **FR-8**  | Save useful outputs into a report-building flow.                                   | P1       | frontend state plus backend persistence later           |
| **FR-9**  | Show references associated with saved outputs.                                     | P1       | citation metadata from backend                          |
| **FR-10** | Initiate report export and communicate export status.                              | P2       | backend export endpoint later                           |

---

## 12. UX and State Requirements

### 12.1 Search Experience

- Search should feel fast and legible even when backend responses are loading.
- Empty, loading, and no-results states must be first-class.
- Filters and search terms should be recoverable from the URL when practical.

### 12.2 Navigation and Layout

- Major workflow steps should have stable routes or route segments.
- Layout boundaries should minimize flashing between search, workspace, and report flows.
- The UI should work well for split-pane research tasks on desktop and remain usable on smaller screens.

### 12.3 Status Communication

- Backend-specific statuses should be translated into researcher-friendly copy.
- The app should distinguish at least: crawl queued, crawling, metadata stored, files downloading, parsing, embedding, ready, and failed.
- Failed or partial imports must provide actionable retry or refresh paths when backend support exists.

### 12.4 Citation Interaction

- Citation targets must be obvious in the answer UI.
- Inspecting a citation should preserve the main conversation context.

---

## 13. Information Architecture

Suggested top-level surfaces:

- **Search**
  - query, filters, results, preview, import actions, start-ingestion action
- **Ingestion**
  - crawl runs, source-item progress, job visibility, failure/retry controls
- **Workspace**
  - active source context, chat, citations, source inspector
- **Report**
  - saved findings, references, export actions

The exact route structure can evolve, but it should preserve:

- meaningful URL state
- recoverable workspace context
- clear movement between discovery, analysis, and reporting

---

## 14. Frontend Architecture

### Chosen Direction

- **Framework:** Next.js App Router with TypeScript
- **Integration model:** HTTP calls to `apps/backend`
- **Rendering model:** Use server rendering where it improves perceived performance and client rendering where interaction requires it

### Architectural Guidance

- Keep source and workspace data models aligned with normalized backend responses
- Avoid duplicating backend business rules in client code
- Use thin adapters for API calls and response normalization where needed
- Keep report-builder state isolated from search and chat state where possible

---

## 15. Phase Plan

### Phase 1: Search and Import UX

- search page and result list
- item preview
- import actions
- topic-ingestion actions
- ingestion state visibility

### Phase 2: Research Workspace

- workspace layout
- chat interface
- citation rendering
- source inspector

### Phase 3: Reporting UX

- save-to-report interactions
- references aggregation in the UI
- export initiation and status feedback

---

## 16. Acceptance Criteria

The FigJam frontend is successful for v1 when:

- researchers can search normalized Figshare-backed content from the app
- a topic query can be turned into a durable ingestion run through backend APIs
- selected items can still be imported through backend APIs when needed
- the app clearly shows whether crawl runs and imported items are processing, ready, or failed
- users can ask questions in a research workspace tied to imported material
- answers include inspectable citations
- users can collect useful outputs into a report-oriented surface
- the app does not embed ingestion, parsing, or vectorization logic locally

---

## 17. Risks

### Product Risks

- unclear backend status mapping could make the workflow feel unreliable
- long-running crawls could feel stalled if progress is not updated clearly
- chat answers may feel untrustworthy if citation UI is weak even when backend data is correct
- search-to-workspace transitions may feel fragmented if route state is poorly designed

### Implementation Risks

- overusing client-only state could make workspace restoration difficult
- inconsistent backend response shapes could leak complexity into the UI
- long-running import flows could create confusing stale states without deliberate refresh behavior

---

## 18. Open Questions

- Should search results be fully backend-normalized before they reach the UI, or should the frontend adapt source-specific differences?
- What is the desired route model for moving from search into a research workspace?
- Should imported source context be session-based, URL-based, or persisted server-side?
- Will report export be generated fully by the backend, or will the frontend assemble a client-side document in the first version?
- What ingestion states need bespoke UI treatment versus a generic status model?

---

## 19. Recommendation

Treat FigJam as the **research workflow frontend** and `apps/backend` as the **processing platform**.

Implement the frontend in this order:

1. search and topic-ingestion UX
2. ingestion monitoring and transition into workspace
3. workspace and citation inspection
4. report assembly and export UX

The key product rule is:

**the frontend should make backend capabilities usable, legible, and trustworthy without reimplementing them.**

The key workflow rule is:

**a researcher should be able to start with a topic search, monitor the ingestion run over time, and only then speak to an agent against the ingested corpus.**
