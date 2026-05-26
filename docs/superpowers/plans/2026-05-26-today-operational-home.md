# Today Operational Home Implementation Plan

> **For Codex:** Execute this plan in the current session; the user approved the product direction.

**Goal:** Make Freescale open on a calm, action-first `Aujourd'hui` view that converts Mue findings into conversations or tasks.

**Architecture:** Add a dedicated client view powered by the existing `dailyBriefing` and `createTaskFromBrief` server actions. Wire it into Zustand navigation and AppShell visibility, while reducing obsolete welcome/upgrade interruption and improving heuristic triage inputs.

**Tech Stack:** Next.js 15, React 19, Zustand, CSS, Vitest.

---

### Task 1: Lock product behavior with tests

**Files:**
- Modify: `apps/web/lib/triage-rules.test.ts`
- Create: `apps/web/components/TodayView.test.ts`

1. Add test cases for job alerts and French retail discounts.
2. Add structural integration assertions for the new default view, daily brief actions, trial urgency, and removed welcome interstitial.
3. Run the targeted tests and confirm they fail before implementation.

### Task 2: Add the action-first home

**Files:**
- Create: `apps/web/components/TodayView.tsx`
- Modify: `apps/web/components/AppShell.tsx`
- Modify: `apps/web/components/Sidebar.tsx`
- Modify: `apps/web/components/CommandPalette.tsx`
- Modify: `apps/web/lib/types.ts`
- Modify: `apps/web/lib/store.ts`
- Modify: `apps/web/app/globals.css`

1. Render the Mue daily briefing, loading/error/empty states, contextual counts, and explicit actions.
2. Default new and existing persisted sessions to `Aujourd'hui` through the store version migration.
3. Add navigation and responsive, restrained operational styling.

### Task 3: Remove distraction and improve signal quality

**Files:**
- Modify: `apps/web/components/MuePanel.tsx`
- Modify: `apps/web/components/billing/TrialBanner.tsx`
- Modify: `apps/web/lib/triage-rules.ts`

1. Remove the old onboarding card from the conversation copilot panel.
2. Display trial conversion messaging only at expiry or in the last three days.
3. Route obvious automated job alerts and discount offers out of `Clients`.

### Task 4: Verify and release

1. Run targeted tests, lint, typecheck, full tests, and production build.
2. Inspect the new UI in the local browser on desktop and mobile-sized layouts.
3. Commit, push to `main`, and verify the production deployment.
