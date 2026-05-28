# Hungry-4-Joy Workflow

Hungry-4-Joy uses a lightweight agile workflow to build the system in small, demoable vertical slices.

The goal is to avoid building isolated pieces that only work on paper. Each slice should move the project closer to a working nonprofit donation ecosystem.

## Workflow Loop

```text
Backlog -> Sprint -> Build -> Demo -> Retro -> Next Sprint
```

Sprint length can vary based on scope.

## Backlog Structure

Backlog items should be small enough to finish and verify.

Good backlog item examples:

- Set up DDEV WordPress.
- Create Twenty Twenty-Five child theme.
- Add Sass/SCSS workflow for child theme styling.
- Add a campaign page template.
- Add accessibility and SEO checks for the campaign page.
- Pass campaign metadata into FoxyCart.
- Receive a FoxyCart event in Laravel.
- Store a donation event.
- Sync a donor to HubSpot.
- Build dashboard table for webhook events.
- Add Tailwind CSS dashboard styling.
- Add failed sync retry.
- Add GitHub Actions checks.

Each issue should include:

- goal
- acceptance criteria
- verification step
- notes or screenshots when useful

## Board Columns

Suggested columns:

```text
Backlog
Ready
In Progress
Review
Done
```

Suggested labels:

- `epic`
- `feature`
- `bug`
- `docs`
- `scenario`
- `tech-debt`
- `blocked`
- `ready`
- `done`

## Sprint Plan

### Sprint 1: WordPress Campaign Page

Goal:

- Prove the public site can start the donation flow.

Scope:

- DDEV WordPress running.
- Twenty Twenty-Five child theme.
- Sass/SCSS styling workflow for the child theme.
- One campaign page.
- Donation amount buttons.
- Campaign metadata prepared for checkout.
- Basic accessibility, SEO, and performance checks.

Demo:

- Show the campaign page, the metadata that will be sent to the checkout layer, and the accessibility/SEO checks.

### Sprint 2: Laravel Event Receiver

Goal:

- Prove the integration layer can receive donation events.

Scope:

- Laravel app running.
- Webhook endpoint.
- Mock or test FoxyCart event.
- Event validation.
- Safe normalized event fields stored.
- Duplicate event sends ignored.

Demo:

- Submit a simulated donation event and show it stored locally.

### Sprint 3: HubSpot Sync

Goal:

- Prove donor and donation data can sync to HubSpot.

Scope:

- Queue job for HubSpot sync.
- Contact create/update.
- Donation amount attached as activity, note, deal, or available record type.
- Sync status saved locally.

Demo:

- Show the local donation record and the matching HubSpot update.

### Sprint 4: Admin Dashboard

Goal:

- Make troubleshooting visible.

Scope:

- React/Next.js dashboard view.
- Tailwind CSS dashboard styling.
- Webhook event table.
- HubSpot sync status.
- Failure details.
- Retry action.
- Retry history and incident notes.

Demo:

- Show a failed sync, the error, the retry, and the corrected status.

### Sprint 5: Analytics and Observability

Goal:

- Add useful event tracking and operational visibility.

Scope:

- Donation journey events.
- Consent-aware event behavior.
- HubSpot sync success/failure events.
- Basic alert flags for repeated failures.
- Incident notes.
- Application-table dashboard remains the source of truth.
- Optional later links to Sentry/OpenTelemetry can be planned but not required.

Demo:

- Show event tracking and a repeated-failure scenario with an incident note.

### Sprint 6: CI/CD and Deployment

Goal:

- Add repeatable checks and deployment workflow.

Scope:

- GitHub Actions workflow.
- Laravel tests with PHPUnit or Pest.
- Laravel Pint.
- Sass/SCSS build checks when the WordPress child theme styling workflow exists.
- Front-end lint/typecheck/build checks when the React/Next.js Tailwind dashboard exists.
- Render deployment for Laravel service if ready.

Demo:

- Show passing CI checks and, if ready, deployed Laravel service health.

## Operational Scenarios as Acceptance Tests

Operational scenarios should become acceptance tests or demo walkthroughs.

### Failed Checkout

Acceptance criteria:

- Donation starts from the campaign page.
- FoxyCart or mock checkout event reports failure.
- No false donation record is created.
- Failed payment details are stored as safe normalized failure fields.
- Dashboard shows the failed state after dashboard work exists.

### Missing HubSpot Gift

Acceptance criteria:

- FoxyCart event is received successfully.
- Local donation record exists.
- HubSpot sync fails.
- Failure reason is visible.
- Retry can be attempted safely.

### Duplicate Webhook Event

Acceptance criteria:

- Same event ID can be submitted twice.
- First event creates the local checkout event row.
- Second event is ignored as a duplicate.
- No duplicate HubSpot update occurs after CRM sync exists.
- Dashboard shows duplicate status after dashboard work exists.

### Campaign Launch

Acceptance criteria:

- Campaign page has campaign metadata.
- Donation metadata reaches FoxyCart.
- Laravel stores the donation with campaign attribution.
- HubSpot contact or campaign status is updated.
- Analytics event is logged.

### HubSpot Field Mapping Error

Acceptance criteria:

- HubSpot rejects an invalid payload.
- API error is stored locally.
- Dashboard shows the failed sync.
- Mapping can be corrected.
- Retry succeeds without duplicate donation records.

### Reconciliation Mismatch

Acceptance criteria:

- Source transaction and local donation records can be compared.
- Mismatch is visible.
- Incident note records cause and action taken.
- Corrected state can be verified.

### Analytics Consent or Duplicate-Event Issue

Acceptance criteria:

- Browser-side event respects consent state.
- Duplicate event is detectable.
- Server-side conversion event can be compared against browser event.
- Dashboard or logs show enough detail to explain the issue.

### Repeated Failure Alert

Acceptance criteria:

- Repeated webhook, queue, or HubSpot failures trigger an alert flag.
- Retry history is visible.
- Incident note captures cause, impact, fix, and verification.

### Campaign Page Quality Issue

Acceptance criteria:

- Campaign page can be checked for layout, accessibility, SEO, and performance issues.
- Campaign metadata handoff still works after page changes.
- Mobile layout is reviewed.
- Any issue found has a documented fix or follow-up task.

## Definition of Done

A task is done when:

- acceptance criteria are met
- code works locally
- relevant tests or manual verification are complete
- no secrets are committed
- documentation is updated when behavior changes
- dashboard/logs show the expected state when relevant
- screenshots or notes are added when they help explain the work

## Working Principles

- Build vertical slices, not disconnected layers.
- Keep the MVP small.
- Prefer visible integration behavior over polished UI early.
- Make failures easy to inspect.
- Treat operational scenarios as real product scenarios.
- Improve realism one system at a time.
