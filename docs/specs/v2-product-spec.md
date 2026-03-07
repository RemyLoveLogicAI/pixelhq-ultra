# PixelHQ ULTRA v2 Product Spec

## Summary

PixelHQ ULTRA v2 evolves the current single-screen pixel office demo into a multi-surface swarm operations platform. The product will support desktop web, mobile web, and a Chrome extension on top of a shared swarm engine, with the pixel office preserved as an optional visualization mode rather than the primary interface.

The purpose of v2 is to help operators understand, manage, and replay parallel agent work. The system should expose queues, handoffs, blockers, retries, throughput, artifacts, and approvals in a way that scales beyond a single animated office scene.

## Problem Statement

The current application is visually distinctive, but it is still structured like a demo:

- The rendering and business logic are tightly coupled in a single large React component.
- The main interface is optimized for one fixed-width desktop surface.
- Parallel execution is implied by animation, but not represented as an inspectable swarm model.
- Platform-specific use cases for mobile and browser capture are not first-class.
- Several QA findings point to structural issues around responsiveness, accessibility, and recoverability.

v2 should solve those issues by separating engine, UI, and bridge concerns while introducing a real swarm state model.

## Product Goals

- Make parallel swarm orchestration the core product experience.
- Support four surfaces cleanly: desktop, mobile, web operator/admin, and Chrome extension capture.
- Preserve the visual identity of the pixel office while making it optional.
- Improve reliability, accessibility, and replayability.
- Enable future expansion into real-time monitoring and coordination workflows.

## Non-Goals

- Native iOS or Android applications in the first v2 milestone.
- Multiplayer collaborative editing beyond basic multi-viewer support.
- Full enterprise auth and RBAC in the first MVP.
- Replacing the bridge ingestion model with deep IDE plugins in v2 MVP.

## Users

- Swarm operator managing active agent runs.
- Technical lead reviewing blockers, handoffs, and throughput.
- Mobile approver triaging alerts and decisions.
- Browser-based user capturing context into the swarm through the extension.

## Core Product Surfaces

### Desktop Web

Primary operations console with command center, board, graph, timeline, agent views, settings, and the optional pixel map.

### Mobile Web

Reduced workflow focused on alerts, approvals, health, and compact swarm summaries. Mobile is not intended to expose the full control surface.

### Web Spectator/Admin

Accessible browser-based views for read-heavy workflows such as dashboards, health, settings, and audit review.

### Chrome Extension

Context capture surface for browser pages, allowing the user to convert page state, selected text, or annotations into swarm tasks.

## Core Concepts

### Swarm

A named workspace-level orchestration unit containing policies, agents, queues, and active runs.

### Run

A bounded execution session within a swarm. A run has a lifecycle, event stream, associated tasks, and generated artifacts.

### Agent

A worker identity with role, capabilities, current state, health, platform affinity, and tool provenance.

### Task

A unit of work with ownership, priority, dependencies, retries, blockers, and artifacts.

### Event

An append-only fact emitted by the bridge, engine, UI, or coordinator. Events drive replay, metrics, and derived UI state.

### Artifact

A diff, file reference, URL, summary, comment, or generated output tied to a task, agent, or run.

### Approval

A user decision request, typically routed to mobile or desktop for escalation, approval, or rejection.

## Functional Requirements

### Swarm Operations

- View active swarms and swarm health.
- Inspect queue depth, blocked tasks, retries, and failures.
- View agent allocation and workload distribution.
- Open a run and inspect all tasks, events, and artifacts.
- Replay a run from the event stream.

### Task Flow

- Create, assign, block, retry, and complete tasks.
- Show task dependencies and handoffs between agents.
- Track retry count and blocker reason.
- Attach artifacts and summaries to tasks.

### Agent Visibility

- Show agent state, current task, capabilities, and recent activity.
- Surface platform affinity such as desktop, mobile, web, and Chrome extension.
- Show health and heartbeat status.

### Platform Features

- Mobile must support alerts and approvals.
- Desktop must support deep inspection and active monitoring.
- Web must support admin and spectator views.
- Chrome extension must support browser context capture.

### Replay and Audit

- Persist an append-only event stream per run.
- Allow event filtering by task, agent, event type, and severity.
- Support timeline replay for debugging and analysis.

## Quality Requirements

- Responsive across narrow mobile and wide desktop viewports.
- Accessible keyboard and screen-reader support on all primary controls.
- Resilient bridge reconnect behavior.
- Pixel map rendering must avoid large DOM tile counts at scale.
- Event model must be deterministic enough for replay and derived metrics.

## Technical Architecture

v2 will use a monorepo with app surfaces in `apps/`, shared logic in `packages/`, and service processes in `services/`.

The swarm engine will own event schemas, reducers, selectors, scheduling logic, retries, and replay. UI packages will consume derived state rather than recreating orchestration logic in each app. Bridge ingestion and sanitization will be isolated from UI rendering.

## Proposed Folder Structure

```text
pixelhq-ultra/
  apps/
    web/
      app/
        layout.tsx
        page.tsx
        dashboard/page.tsx
        swarms/page.tsx
        swarms/[swarmId]/page.tsx
        swarms/[swarmId]/board/page.tsx
        swarms/[swarmId]/graph/page.tsx
        swarms/[swarmId]/timeline/page.tsx
        swarms/[swarmId]/runs/[runId]/page.tsx
        agents/page.tsx
        agents/[agentId]/page.tsx
        settings/page.tsx
        settings/platforms/page.tsx
        settings/integrations/page.tsx
        api/
          health/route.ts
          events/route.ts
          swarms/route.ts
          runs/route.ts
      components/
        layout/
        panels/
        charts/
        map/
      lib/
        client.ts
        auth.ts
        stores.ts
    mobile/
      app/
        layout.tsx
        page.tsx
        alerts/page.tsx
        approvals/[approvalId]/page.tsx
        swarms/page.tsx
        swarms/[swarmId]/page.tsx
        agents/page.tsx
      components/
        cards/
        sheets/
        nav/
    extension/
      src/
        background/index.ts
        content/index.ts
        popup/index.tsx
        options/index.tsx
        shared/messages.ts
      public/
        manifest.json
  packages/
    engine/
      src/
        events/
          schema.ts
          reducer.ts
          selectors.ts
        swarm/
          types.ts
          state.ts
          policies.ts
        replay/
          recorder.ts
          player.ts
        coordination/
          scheduler.ts
          handoffs.ts
          retries.ts
    ui/
      src/
        command-center/
        swarm-board/
        swarm-graph/
        run-timeline/
        agent-roster/
        mobile-ops/
        a11y/
    bridge/
      src/
        server.ts
        websocket.ts
        parsers/
          claude.ts
          codex.ts
          gemini.ts
          opencode.ts
        sanitizers/
          pii.ts
          commands.ts
    shared/
      src/
        types/
        constants/
        utils/
  services/
    coordinator/
    ingest/
    replay-worker/
  docs/
    specs/
      v2-product-spec.md
```

## Route Map

### Web

- `/`
  Marketing, overview, and entry points.
- `/dashboard`
  System health, active swarms, alerts, throughput, and failures.
- `/swarms`
  Swarm directory and high-level summaries.
- `/swarms/[swarmId]`
  Main command center overview.
- `/swarms/[swarmId]/board`
  Queue lanes and task state board.
- `/swarms/[swarmId]/graph`
  Dependency graph and agent handoff visualization.
- `/swarms/[swarmId]/timeline`
  Event timeline, filters, and replay.
- `/swarms/[swarmId]/runs/[runId]`
  Single run drilldown.
- `/agents`
  Agent roster.
- `/agents/[agentId]`
  Agent health, capabilities, tasks, and artifacts.
- `/settings`
  Workspace settings.
- `/settings/platforms`
  Platform surface configuration.
- `/settings/integrations`
  Bridge endpoints, auth, notifications, and ingest settings.

### Mobile

- `/`
  Condensed health view.
- `/alerts`
  Critical alerts and triage.
- `/approvals/[approvalId]`
  Approval or rejection workflow.
- `/swarms`
  Active swarms list.
- `/swarms/[swarmId]`
  Compact board and run summary.
- `/agents`
  Lightweight roster and health view.

### Extension

- Popup
  Quick capture and task creation.
- Content overlay
  Page annotation and context selection.
- Options
  Workspace binding, permissions, and filters.

## Primary UI Modules

- `CommandCenterHeader`
  Active run state, alerts, controls, and mode switch.
- `SwarmBoard`
  Queues, blockers, retries, and completion flow.
- `SwarmGraph`
  Task DAG and handoffs.
- `RunTimeline`
  Replayable event log.
- `AgentRoster`
  Health, roles, capabilities, and assignments.
- `ArtifactDrawer`
  Diffs, summaries, and linked outputs.
- `PixelMap`
  Optional office visualization mode backed by canvas or WebGL.
- `MobileOpsSheet`
  Alerts, approvals, and condensed actions.
- `ExtensionCapturePanel`
  Browser context capture UI.

## Rendering Strategy

The existing DOM tile approach should not remain the primary renderer for the map layer. v2 should move map, particles, and graph-heavy visualizations to canvas or WebGL while keeping accessible controls in standard DOM.

The pixel office should be treated as a view mode rather than the default information architecture.

## Data Flow

1. Bridge adapters sanitize incoming CLI events.
2. Ingest service validates and appends events.
3. Engine reducer derives swarm, run, task, and agent state.
4. Selectors expose view-specific models to UI surfaces.
5. Replay worker reconstructs prior runs from stored events.

## Implementation Phases

### Phase 0: Foundation

- Set up monorepo structure.
- Create shared type definitions.
- Extract engine concepts out of the current monolithic UI.
- Define event schema and storage model.

Exit criteria:

- Shared packages build successfully.
- Web app can import and render engine-derived mock state.

### Phase 1: Stabilization

- Fix QA blockers around responsiveness, accessibility, and reconnect behavior.
- Remove assumptions that force a single-width layout.
- Improve state handling where current demo logic is brittle.

Exit criteria:

- Current v1 feature set works on desktop and baseline mobile.
- Keyboard focus and readable sizing exist across core controls.

### Phase 2: Swarm Core

- Implement swarm, run, task, approval, and artifact models.
- Add retries, blockers, dependencies, and handoffs.
- Add replay recorder and player.

Exit criteria:

- Engine can simulate and replay a parallel run without UI-specific logic.

### Phase 3: Desktop Command Center

- Build dashboard, swarm command center, board, graph, and timeline routes.
- Replace the office demo as the primary layout with an operator-focused layout.
- Keep pixel office as an alternate map mode.

Exit criteria:

- Desktop users can monitor and inspect a live swarm end-to-end.

### Phase 4: Mobile Ops

- Build alerts, approvals, and compact swarm summaries.
- Optimize touch workflows and narrow layouts.

Exit criteria:

- Mobile users can triage alerts and complete approvals.

### Phase 5: Chrome Extension

- Build popup, content script, and options flows.
- Add browser context capture into swarm tasks.
- Enforce strict sanitization before ingestion.

Exit criteria:

- A user can capture page context from the browser and create a task in a swarm.

### Phase 6: Hardening

- Add performance testing.
- Add replay export and analytics.
- Add service health dashboards.
- Complete accessibility and responsive QA passes.

Exit criteria:

- The platform is stable under multi-agent load and usable across target surfaces.

## MVP Definition

v2 MVP is complete when:

- Desktop web uses the shared engine and exposes swarm board, graph, and timeline views.
- Mobile supports alerts and approvals.
- Chrome extension can create tasks from browser context.
- Runs are replayable from an event log.
- The existing critical QA issues are resolved.

## Open Questions

- Should the mobile surface be a dedicated Next.js app or a route group within the web app?
- Will event persistence live inside Next.js APIs initially or move immediately to dedicated services?
- What level of auth is required before exposing spectator or admin routes?
- Does v2 need multi-user operator sessions in MVP or only multi-viewer read access?

## Recommended Immediate Next Step

Create Phase 0 implementation tickets from this spec and begin by extracting the shared engine and event schema before any UI rewrite work.
