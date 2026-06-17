const formatDate = (value) => {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
};

function validateRentalDates(dateOut, dateReturn) {
    if (!dateOut || !dateReturn) {
        return {
            ok: false,
            status: 400,
            error: 'Date out and date return are required',
        };
    }

    const out = new Date(dateOut);
    const ret = new Date(dateReturn);

    if (Number.isNaN(out.getTime()) || Number.isNaN(ret.getTime())) {
        return {
            ok: false,
            status: 400,
            error: 'Invalid rental dates',
        };
    }

    if (ret < out) {
        return {
            ok: false,
            status: 400,
            error: 'Date return cannot be before date out',
        };
    }

    return { ok: true, dateOut, dateReturn };
}

function mapConflictRow(row) {
    return {
        invoiceId: row.id,
        invoiceNo: row.invoice_no,
        dateOut: formatDate(row.date_out),
        dateReturn: formatDate(row.date_return),
    };
}

function buildConflictPayload(conflict) {
    return {
        error: 'Vehicle is already rented for the selected dates',
        conflict,
    };
}

async function findOverlappingRental(client, { vehicleId, dateOut, dateReturn, excludeInvoiceId }) {
    const result = await client.query(
        `SELECT id, invoice_no, date_out, date_return
         FROM invoices
         WHERE vehicle_id = $1
           AND date_out IS NOT NULL
           AND date_return IS NOT NULL
           AND date_out <= $3
           AND date_return >= $2
           AND id <> COALESCE($4, -1)
         LIMIT 1`,
        [vehicleId, dateOut, dateReturn, excludeInvoiceId ?? null]
    );

    return result.rows[0] || null;
}

async function resolveExcludeInvoiceId(client, { excludeInvoiceId, excludeInvoiceNo }) {
    if (excludeInvoiceId) {
        const parsed = Number(excludeInvoiceId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    if (!excludeInvoiceNo || !String(excludeInvoiceNo).trim()) {
        return null;
    }

    const result = await client.query(
        'SELECT id FROM invoices WHERE invoice_no = $1 LIMIT 1',
        [String(excludeInvoiceNo).trim()]
    );

    return result.rows[0]?.id ?? null;
}

async function assertVehicleAvailable(client, { vehicleId, dateOut, dateReturn, excludeInvoiceId, excludeInvoiceNo }) {
    if (!vehicleId) {
        return {
            ok: false,
            status: 400,
            error: 'Vehicle is required',
        };
    }

    const dateValidation = validateRentalDates(dateOut, dateReturn);
    if (!dateValidation.ok) {
        return dateValidation;
    }

    const excludeId = await resolveExcludeInvoiceId(client, { excludeInvoiceId, excludeInvoiceNo });
    const overlap = await findOverlappingRental(client, {
        vehicleId,
        dateOut: dateValidation.dateOut,
        dateReturn: dateValidation.dateReturn,
        excludeInvoiceId: excludeId,
    });

    if (overlap) {
        return {
            ok: false,
            status: 409,
            ...buildConflictPayload(mapConflictRow(overlap)),
        };
    }

    return { ok: true, dateOut: dateValidation.dateOut, dateReturn: dateValidation.dateReturn };
}

async function checkVehicleAvailability(client, options) {
    const result = await assertVehicleAvailable(client, options);

    if (!result.ok) {
        if (result.status === 409) {
            return {
                available: false,
                message: result.error,
                conflict: result.conflict,
            };
        }

        return {
            available: false,
            message: result.error,
        };
    }

    return { available: true };
}

module.exports = {
    validateRentalDates,
    findOverlappingRental,
    assertVehicleAvailable,
    checkVehicleAvailability,
    buildConflictPayload,
    mapConflictRow,
    formatDate,
};
