const db = require('../db');
const { generateInvoicePDF } = require('../services/pdfService');
const {
    assertVehicleAvailable,
    buildConflictPayload,
} = require('../services/rentalOverlap');

const cleanDate = (dateString) => (dateString && dateString.trim() !== "") ? dateString : null;

function normalizeInvoicePayload(data) {
    const toNumber = (value, fallback = 0) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    data.repairer = data.repairer || {};
    data.thirdParty = data.thirdParty || {};
    data.inspection = data.inspection || {};
    data.billing = data.billing || {};
    data.billing.dailyRentalDays = toNumber(data.billing.dailyRentalDays);
    data.billing.dailyRentalRate = toNumber(data.billing.dailyRentalRate);
    data.billing.excessReductionDays = toNumber(data.billing.excessReductionDays);
    data.billing.excessReductionRate = toNumber(data.billing.excessReductionRate);
    data.billing.registrationRecoveryDays = toNumber(data.billing.registrationRecoveryDays);
    data.billing.registrationRecoveryRate = toNumber(data.billing.registrationRecoveryRate);
    data.billing.deliveryCharge = toNumber(data.billing.deliveryCharge);
    data.billing.subTotal = toNumber(data.billing.subTotal);
    data.billing.gst = toNumber(data.billing.gst);
    data.billing.grandTotal = toNumber(data.billing.grandTotal);

    return data;
}

async function resolveVehicleId(client, vehicle) {
    await client.query(
        `INSERT INTO vehicles (make, model, colour, registration) VALUES ($1, $2, $3, $4) ON CONFLICT (registration) DO NOTHING`,
        [vehicle.make, vehicle.model, vehicle.colour, vehicle.registration]
    );
    const vehicleRes = await client.query(`SELECT id FROM vehicles WHERE registration = $1`, [vehicle.registration]);
    return vehicleRes.rows[0]?.id ?? null;
}

exports.createInvoice = async (req, res) => {
    const client = await db.pool.connect();
    const data = normalizeInvoicePayload({ ...req.body });
    let invoiceId;

    try {
        if (!data.vehicle?.registration?.trim()) {
            return res.status(400).json({ error: 'Vehicle registration is required' });
        }

        const vehicleId = await resolveVehicleId(client, data.vehicle);
        const availability = await assertVehicleAvailable(client, {
            vehicleId,
            dateOut: cleanDate(data.rental?.dateOut),
            dateReturn: cleanDate(data.rental?.dateReturn),
            excludeInvoiceNo: data.invoiceNo,
        });

        if (!availability.ok) {
            const body = availability.status === 409
                ? buildConflictPayload(availability.conflict)
                : { error: availability.error };
            return res.status(availability.status).json(body);
        }

        await client.query('BEGIN');

        // 1. Insert Driver
        const driverRes = await client.query(
            `INSERT INTO drivers (full_name, street_address, suburb, state, post_code, home_phone, mobile_phone, work_phone, dob, email, licence_no, state_of_issue, licence_expiry) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
            [data.driver.fullName, data.driver.streetAddress, data.driver.suburb, data.driver.state, data.driver.postCode, data.driver.homePhone, data.driver.mobilePhone, data.driver.workPhone, cleanDate(data.driver.dob), data.driver.email, data.driver.licenceNo, data.driver.stateOfIssue, cleanDate(data.driver.licenceExpiry)]
        );
        const driverId = driverRes.rows[0].id;

        // 2. Insert/Update Invoice (upsert on invoice_no so corrections can be re-downloaded)
        const invoiceRes = await client.query(
            `INSERT INTO invoices (
        invoice_no, third_party_claim_no, invoice_date, client_registration, 
        driver_id, vehicle_id, date_out, time_out, date_return, time_return, 
        kms_out, kms_return, excess_amount, total_days, 
        repairer_name, repairer_phone, 
        tp_insurance_company, tp_claim_number, tp_driver_name, tp_damaged_vehicle_rego, tp_date_of_accident,
        inspection_fuel_level, inspection_fuel_type, inspection_condition, inspector_name,
        signature, acknowledged
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27) 
    ON CONFLICT (invoice_no) DO UPDATE SET
        third_party_claim_no = EXCLUDED.third_party_claim_no,
        invoice_date = EXCLUDED.invoice_date,
        client_registration = EXCLUDED.client_registration,
        driver_id = EXCLUDED.driver_id,
        vehicle_id = EXCLUDED.vehicle_id,
        date_out = EXCLUDED.date_out,
        time_out = EXCLUDED.time_out,
        date_return = EXCLUDED.date_return,
        time_return = EXCLUDED.time_return,
        kms_out = EXCLUDED.kms_out,
        kms_return = EXCLUDED.kms_return,
        excess_amount = EXCLUDED.excess_amount,
        total_days = EXCLUDED.total_days,
        repairer_name = EXCLUDED.repairer_name,
        repairer_phone = EXCLUDED.repairer_phone,
        tp_insurance_company = EXCLUDED.tp_insurance_company,
        tp_claim_number = EXCLUDED.tp_claim_number,
        tp_driver_name = EXCLUDED.tp_driver_name,
        tp_damaged_vehicle_rego = EXCLUDED.tp_damaged_vehicle_rego,
        tp_date_of_accident = EXCLUDED.tp_date_of_accident,
        inspection_fuel_level = EXCLUDED.inspection_fuel_level,
        inspection_fuel_type = EXCLUDED.inspection_fuel_type,
        inspection_condition = EXCLUDED.inspection_condition,
        inspector_name = EXCLUDED.inspector_name,
        signature = EXCLUDED.signature,
        acknowledged = EXCLUDED.acknowledged
    RETURNING id`,
            [
                data.invoiceNo,
                data.thirdPartyClaimNo,
                cleanDate(data.invoiceDate),
                data.clientRegistration,
                driverId,
                vehicleId,
                cleanDate(data.rental.dateOut),
                data.rental.timeOut || null,
                cleanDate(data.rental.dateReturn),
                data.rental.timeReturn || null,
                Number(data.rental.kmsOut) || 0,
                Number(data.rental.kmsReturn) || 0,
                Number(data.rental.excessAmount) || 0,
                Number(data.rental.totalDays) || 0,
                data.repairer.name,
                data.repairer.phone,
                data.thirdParty.insuranceCompany,
                data.thirdParty.claimNumber,
                data.thirdParty.driverName,
                data.thirdParty.damagedVehicleRego,
                cleanDate(data.thirdParty.dateOfAccident),
                data.inspection.fuelLevel,
                data.inspection.fuelType,
                data.inspection.condition,
                data.inspection.inspectorName,
                data.signature || null,
                data.acknowledged === true
            ]
        );
        invoiceId = invoiceRes.rows[0].id;

        // 4. Insert Billing (clear any previous breakdown first so re-submits stay in sync)
        await client.query(`DELETE FROM billing_breakdowns WHERE invoice_id = $1`, [invoiceId]);
        await client.query(
            `INSERT INTO billing_breakdowns (
                invoice_id, daily_rental_days, daily_rental_rate, excess_reduction_days, excess_reduction_rate,
                registration_recovery_days, registration_recovery_rate, delivery_charge, sub_total, gst, grand_total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                invoiceId, data.billing.dailyRentalDays, data.billing.dailyRentalRate, data.billing.excessReductionDays, data.billing.excessReductionRate,
                data.billing.registrationRecoveryDays, data.billing.registrationRecoveryRate, data.billing.deliveryCharge,
                data.billing.subTotal, data.billing.gst, data.billing.grandTotal
            ]
        );

        await client.query('COMMIT');
    } catch (error) {
        console.error('DETAILED ERROR:', error);
        try {
            await client.query('ROLLBACK');
        } catch {
            // ignore rollback errors when no transaction is open
        }
        console.error('Error creating invoice:', error);

        if (error.code === '23505' && error.constraint === 'invoices_invoice_no_key') {
            return res.status(409).json({
                error: `Invoice number "${req.body && req.body.invoiceNo}" already exists. Please use a unique invoice number.`
            });
        }

        if (error.code === '23P01') {
            return res.status(409).json({
                error: 'Vehicle is already rented for the selected dates',
            });
        }

        return res.status(500).json({ error: error.message || 'Failed to save invoice' });
    } finally {
        client.release();
    }

    try {
        const pdfBuffer = await generateInvoicePDF(data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${data.invoiceNo}.pdf"`);
        res.send(pdfBuffer);
    } catch (pdfError) {
        console.error('PDF generation failed after invoice saved:', pdfError);
        res.status(500).json({
            error: `Invoice saved but PDF failed: ${pdfError.message}. Open Invoice Log to download it later.`,
            invoiceId,
            saved: true,
        });
    }
};

// --- Invoice log helpers ---------------------------------------------------

const formatDate = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

const toNum = (value) => Number(value) || 0;

// Rebuilds the nested shape the EJS template expects from a flat joined DB row.
const mapRowToInvoiceData = (row) => ({
    invoiceNo: row.invoice_no,
    invoiceDate: formatDate(row.invoice_date),
    thirdPartyClaimNo: row.third_party_claim_no || '',
    clientRegistration: row.client_registration || '',
    signature: row.signature || '',
    acknowledged: row.acknowledged === true,
    driver: {
        fullName: row.full_name || '',
        streetAddress: row.street_address || '',
        suburb: row.suburb || '',
        state: row.state || '',
        postCode: row.post_code || '',
        homePhone: row.home_phone || '',
        mobilePhone: row.mobile_phone || '',
        workPhone: row.work_phone || '',
        dob: formatDate(row.dob),
        email: row.email || '',
        licenceNo: row.licence_no || '',
        stateOfIssue: row.state_of_issue || '',
        licenceExpiry: formatDate(row.licence_expiry)
    },
    vehicle: {
        make: row.make || '',
        model: row.model || '',
        colour: row.colour || '',
        registration: row.registration || ''
    },
    rental: {
        dateOut: formatDate(row.date_out),
        timeOut: row.time_out || '',
        dateReturn: formatDate(row.date_return),
        timeReturn: row.time_return || '',
        kmsOut: row.kms_out ?? '',
        kmsReturn: row.kms_return ?? '',
        excessAmount: row.excess_amount ?? '',
        totalDays: row.total_days ?? ''
    },
    repairer: {
        name: row.repairer_name || '',
        phone: row.repairer_phone || ''
    },
    thirdParty: {
        insuranceCompany: row.tp_insurance_company || '',
        claimNumber: row.tp_claim_number || '',
        driverName: row.tp_driver_name || '',
        damagedVehicleRego: row.tp_damaged_vehicle_rego || '',
        dateOfAccident: formatDate(row.tp_date_of_accident)
    },
    inspection: {
        fuelLevel: row.inspection_fuel_level || '',
        fuelType: row.inspection_fuel_type || '',
        condition: row.inspection_condition || '',
        inspectorName: row.inspector_name || ''
    },
    billing: {
        dailyRentalDays: toNum(row.daily_rental_days),
        dailyRentalRate: toNum(row.daily_rental_rate),
        excessReductionDays: toNum(row.excess_reduction_days),
        excessReductionRate: toNum(row.excess_reduction_rate),
        registrationRecoveryDays: toNum(row.registration_recovery_days),
        registrationRecoveryRate: toNum(row.registration_recovery_rate),
        deliveryCharge: toNum(row.bb_delivery_charge),
        subTotal: toNum(row.bb_sub_total),
        gst: toNum(row.bb_gst),
        grandTotal: toNum(row.bb_grand_total)
    }
});

// GET /api/invoices -> summary list for the in-app invoice log
exports.listInvoices = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT i.id, i.invoice_no, i.invoice_date, i.created_at,
                    bb.grand_total AS total_amount,
                    d.full_name AS driver_name,
                    v.make, v.model, v.registration
             FROM invoices i
             LEFT JOIN drivers d ON d.id = i.driver_id
             LEFT JOIN vehicles v ON v.id = i.vehicle_id
             LEFT JOIN billing_breakdowns bb ON bb.invoice_id = i.id
             ORDER BY i.created_at DESC, i.id DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing invoices:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// Shared query that returns a single invoice joined with driver, vehicle and billing.
const FULL_INVOICE_QUERY = `SELECT i.*,
        d.full_name, d.street_address, d.suburb, d.state, d.post_code,
        d.home_phone, d.mobile_phone, d.work_phone, d.dob, d.email,
        d.licence_no, d.state_of_issue, d.licence_expiry,
        v.make, v.model, v.colour, v.registration,
        bb.daily_rental_days, bb.daily_rental_rate,
        bb.excess_reduction_days, bb.excess_reduction_rate,
        bb.registration_recovery_days, bb.registration_recovery_rate,
        bb.delivery_charge AS bb_delivery_charge,
        bb.sub_total AS bb_sub_total,
        bb.gst AS bb_gst,
        bb.grand_total AS bb_grand_total
    FROM invoices i
    LEFT JOIN drivers d ON d.id = i.driver_id
    LEFT JOIN vehicles v ON v.id = i.vehicle_id
    LEFT JOIN billing_breakdowns bb ON bb.invoice_id = i.id
    WHERE i.id = $1`;

// GET /api/invoices/:id -> full details for the in-app detail view
exports.getInvoice = async (req, res) => {
    try {
        const result = await db.query(FULL_INVOICE_QUERY, [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        const row = result.rows[0];
        res.json({
            id: row.id,
            createdAt: row.created_at,
            ...mapRowToInvoiceData(row)
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        res.status(500).json({ error: 'Failed to load invoice details' });
    }
};

// GET /api/invoices/:id/pdf -> regenerate and download an existing invoice
exports.downloadInvoice = async (req, res) => {
    try {
        const result = await db.query(FULL_INVOICE_QUERY, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const data = mapRowToInvoiceData(result.rows[0]);

        try {
            const pdfBuffer = await generateInvoicePDF(data);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="invoice-${data.invoiceNo}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('PDF generation failed:', error);
            return res.status(500).json({
                error: 'PDF generation failed',
                details: error.message,
            });
        }
    } catch (error) {
        console.error('Error loading invoice for PDF:', error);
        res.status(500).json({
            error: 'Failed to load invoice for PDF',
            details: error.message,
        });
    }
};

// GET /api/invoices/latest -> the most recently created invoice number (for prefilling the form)
exports.getLatestInvoiceNo = async (req, res) => {
    try {
        const result = await db.query(
            'SELECT invoice_no FROM invoices ORDER BY created_at DESC, id DESC LIMIT 1'
        );
        res.json({ invoiceNo: result.rows.length ? result.rows[0].invoice_no : null });
    } catch (error) {
        console.error('Error fetching latest invoice number:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/invoices/deleted -> log of removed invoices
exports.listDeletedInvoices = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, original_invoice_id, invoice_no, invoice_date, driver_name,
                    make, model, registration, total_amount, deleted_at, data
             FROM deleted_invoices
             ORDER BY deleted_at DESC, id DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error listing deleted invoices:', error);
        res.status(500).json({ error: 'Failed to load deleted invoices' });
    }
};

// DELETE /api/invoices/deleted/:id -> permanently remove a record from the deleted log
exports.deleteDeletedInvoice = async (req, res) => {
    try {
        const result = await db.query('DELETE FROM deleted_invoices WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted record not found' });
        }
        res.json({ success: true, id: result.rows[0].id });
    } catch (error) {
        console.error('Error removing deleted record:', error);
        res.status(500).json({ error: 'Failed to remove deleted record' });
    }
};

// DELETE /api/invoices/:id -> archive the invoice into deleted_invoices, then remove it
exports.deleteInvoice = async (req, res) => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const result = await client.query(FULL_INVOICE_QUERY, [req.params.id]);
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Invoice not found' });
        }

        const row = result.rows[0];
        const snapshot = { ...mapRowToInvoiceData(row), createdAt: row.created_at };

        await client.query(
            `INSERT INTO deleted_invoices
                (original_invoice_id, invoice_no, invoice_date, driver_name, make, model, registration, total_amount, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [row.id, row.invoice_no, row.invoice_date, row.full_name, row.make, row.model,
             row.registration, row.bb_grand_total, JSON.stringify(snapshot)]
        );

        // billing_breakdowns cascades on invoice delete
        await client.query('DELETE FROM invoices WHERE id = $1', [req.params.id]);

        await client.query('COMMIT');
        res.json({ success: true, id: row.id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting invoice:', error);
        res.status(500).json({ error: 'Failed to delete invoice' });
    } finally {
        client.release();
    }
};
