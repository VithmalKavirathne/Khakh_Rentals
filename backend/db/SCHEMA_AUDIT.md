# Invoice schema audit (Option A)

**Decision: Option A** — billing values are stored in `billing_breakdowns`, not on `invoices`.

The hosted Supabase errors (`daily_days`, `daily_rate`, `rego_days`) came from an **older backend** that INSERTed billing columns onto `invoices`. Current `main` uses `billing_breakdowns` only.

---

## 1. Routes and SQL inspected

| Route | Method | SQL action | Tables touched |
|-------|--------|------------|----------------|
| `/api/invoices` | POST | INSERT + ON CONFLICT UPDATE | `drivers`, `vehicles`, `invoices`, `billing_breakdowns` |
| `/api/invoices` | GET | SELECT + JOIN | `invoices`, `drivers`, `vehicles`, `billing_breakdowns` |
| `/api/invoices/latest` | GET | SELECT | `invoices` |
| `/api/invoices/:id` | GET | SELECT + JOIN | `invoices`, `drivers`, `vehicles`, `billing_breakdowns` |
| `/api/invoices/:id/pdf` | GET | SELECT + JOIN | same as above |
| `/api/invoices/:id` | DELETE | INSERT archive + DELETE | `deleted_invoices`, `invoices` (cascade `billing_breakdowns`) |
| `/api/invoices/deleted` | GET | SELECT | `deleted_invoices` |

Source: `backend/controllers/invoiceController.js`

---

## 2. Columns the backend expects on `invoices`

From the INSERT/UPDATE in `createInvoice` (lines 53–88):

| Column | Type (schema.sql) | Used for |
|--------|-------------------|----------|
| `id` | SERIAL PK | auto |
| `invoice_no` | VARCHAR UNIQUE | upsert key |
| `third_party_claim_no` | VARCHAR | header |
| `invoice_date` | DATE | header |
| `client_registration` | VARCHAR | header |
| `driver_id` | INT FK | link to driver |
| `vehicle_id` | INT FK | link to vehicle |
| `date_out` | DATE | rental |
| `time_out` | TIME | rental |
| `date_return` | DATE | rental |
| `time_return` | TIME | rental |
| `kms_out` | INT | rental |
| `kms_return` | INT | rental |
| `excess_amount` | NUMERIC | rental |
| `total_days` | INT | rental |
| `repairer_name` | VARCHAR | repairer |
| `repairer_phone` | VARCHAR | repairer |
| `tp_insurance_company` | VARCHAR | third party |
| `tp_claim_number` | VARCHAR | third party |
| `tp_driver_name` | VARCHAR | third party |
| `tp_damaged_vehicle_rego` | VARCHAR | third party |
| `tp_date_of_accident` | DATE | third party |
| `inspection_fuel_level` | VARCHAR | inspection |
| `inspection_fuel_type` | VARCHAR | inspection |
| `inspection_condition` | VARCHAR | inspection |
| `inspector_name` | VARCHAR | inspection |
| `signature` | TEXT | customer signature (base64) |
| `acknowledged` | BOOLEAN | terms checkbox |
| `created_at` | TIMESTAMP | auto |

**Not on `invoices` (removed from old backend):**

- `daily_days`, `daily_rate`, `rego_days`, `rego_rate`, `delivery_charge`, `sub_total`, `gst`, `total_amount`

---

## 3. Columns on `billing_breakdowns`

From INSERT in `createInvoice` and JOINs in list/detail queries:

| Column | Maps from API field |
|--------|---------------------|
| `invoice_id` | FK to `invoices.id` |
| `daily_rental_days` | `billing.dailyRentalDays` |
| `daily_rental_rate` | `billing.dailyRentalRate` |
| `excess_reduction_days` | `billing.excessReductionDays` |
| `excess_reduction_rate` | `billing.excessReductionRate` |
| `registration_recovery_days` | `billing.registrationRecoveryDays` |
| `registration_recovery_rate` | `billing.registrationRecoveryRate` |
| `delivery_charge` | `billing.deliveryCharge` |
| `sub_total` | `billing.subTotal` |
| `gst` | `billing.gst` |
| `grand_total` | `billing.grandTotal` |

List query exposes total as:

```sql
bb.grand_total AS total_amount
```

Delete archive stores `bb_grand_total` in `deleted_invoices.total_amount`.

---

## 4. Comparison: code vs `schema.sql`

| Area | Status |
|------|--------|
| `invoices` core columns | Match |
| `invoices.signature`, `acknowledged` | In schema.sql + migration 001 |
| Billing on `billing_breakdowns` only | Match (Option A) |
| `deleted_invoices` | Added to schema.sql + migration 001 |
| Legacy billing columns on `invoices` | Dropped by migration 001 if present |

---

## 5. Supabase setup

1. Run `backend/db/migrations/001_fix_invoice_schema.sql` in Supabase SQL Editor **or** redeploy backend (runs on startup via `initDb()`).
2. Redeploy backend from latest `main` so POST no longer references `daily_days` etc.
3. Follow `TEST_CHECKLIST.md`.
