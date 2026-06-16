# Invoice schema test checklist

Run after applying migration `001_fix_invoice_schema.sql` and redeploying backend.

## Supabase SQL (schema sanity)

```sql
-- Invoices should have signature/acknowledged, NOT daily_days/daily_rate/rego_days
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices'
ORDER BY ordinal_position;

-- billing_breakdowns must exist
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'billing_breakdowns'
ORDER BY ordinal_position;
```

Expected: no `daily_days`, `daily_rate`, `rego_days`, `rego_rate`, `total_amount` on `invoices`.

## API tests

Replace `BACKEND_URL` with your Hostinger backend URL.

### 1. GET /api/invoices — empty or list

```bash
curl -s BACKEND_URL/api/invoices
```

Expected: `[]` or JSON array; **not** 500.

### 2. GET /api/invoices/latest

```bash
curl -s BACKEND_URL/api/invoices/latest
```

Expected: `{"invoiceNo":null}` or `{"invoiceNo":"450"}`.

### 3. POST create invoice

Use the app **Save & Download Invoice**, or POST minimal payload via curl (adjust IDs/values):

```bash
curl -s -X POST BACKEND_URL/api/invoices \
  -H "Content-Type: application/json" \
  -H "Origin: YOUR_FRONTEND_URL" \
  -d @test-invoice-payload.json \
  -o invoice.pdf
```

Expected: PDF download **or** JSON with `saved: true` if PDF fails on host.

### 4. Verify row in Supabase

```sql
SELECT id, invoice_no, invoice_date, signature IS NOT NULL AS has_signature, acknowledged
FROM public.invoices
ORDER BY created_at DESC
LIMIT 5;
```

### 5. Verify billing breakdown

```sql
SELECT bb.*
FROM public.billing_breakdowns bb
JOIN public.invoices i ON i.id = bb.invoice_id
ORDER BY i.created_at DESC
LIMIT 5;
```

Expected: one row per invoice with `daily_rental_days`, `grand_total`, etc.

### 6. GET /api/invoices after create

```bash
curl -s BACKEND_URL/api/invoices
```

Expected: new invoice with `total_amount` = `grand_total` from billing join.

## Pass criteria

- [ ] No column errors mentioning `daily_days`, `daily_rate`, or `rego_days`
- [ ] POST create invoice succeeds (save + PDF or save with clear PDF error)
- [ ] GET /api/invoices returns 200
- [ ] GET /api/invoices/latest returns 200
- [ ] Invoice row visible in Supabase `invoices`
- [ ] Matching row in `billing_breakdowns` with correct totals
