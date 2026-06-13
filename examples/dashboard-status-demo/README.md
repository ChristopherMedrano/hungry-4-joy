# Dashboard Status Demo Fixtures

These fixtures seed one checkout event for each dashboard badge state. They are ingested directly by the Laravel demo seeder, not through the public fixture receiver route.

Run:

```bash
cd middleware-api
php artisan dashboard:seed-status-demo
```

The command is idempotent: re-running updates CRM attempt rows without creating duplicate checkout events.

## Coverage

| Fixture | Transaction status | CRM status | Donor email |
| --- | --- | --- | --- |
| `synced-fixture-receiver.json` | Completed | Synced | synced.helper@example.test |
| `foxy-webhook-donation.json` | Completed | Synced | webhook.donor@example.test |
| `crm-warning-donation.json` | Completed | Warning | warning.donor@example.test |
| `crm-pending-donation.json` | Completed | Pending | crm.pending@example.test |
| `crm-failed-donation.json` | Completed | Failed | failed.donor@example.test |
| `crm-retryable-donation.json` | Completed | Retryable | retryable.donor@example.test |
| `checkout-pending-donation.json` | Pending | N/A | checkout.pending@example.test |
| `payment-failed-donation.json` | Failed | N/A | payment.failed@example.test |

All donor data is fictional and uses `@example.test` addresses. Ingest channel (`fixture_receiver` vs `foxy_webhook`) appears in event detail, not the list transaction status column.

Full browser and API verification steps: [`docs/dashboard-verification-walkthrough.md`](../../docs/dashboard-verification-walkthrough.md).
