import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/invoices`;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatMoney = (value) =>
    value === null || value === undefined ? '-' : `$${Number(value).toFixed(2)}`;

const DeletedInvoiceList = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const load = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await axios.get(`${API_URL}/deleted`);
            setRecords(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error loading deleted invoices:', error);
            setErrorMsg('Could not load the deleted log. Make sure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (record) => {
        if (!window.confirm(`Permanently delete the record for invoice "${record.invoice_no}"? This cannot be undone.`)) return;
        setDeletingId(record.id);
        setErrorMsg('');
        try {
            await axios.delete(`${API_URL}/deleted/${record.id}`);
            setRecords((prev) => prev.filter((r) => r.id !== record.id));
            if (selected && selected.id === record.id) setSelected(null);
        } catch (error) {
            console.error('Error removing deleted record:', error);
            setErrorMsg('Failed to permanently delete this record. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return records;
        return records.filter((rec) =>
            [rec.invoice_no, rec.driver_name, rec.registration, rec.make, rec.model]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(term))
        );
    }, [records, search]);

    return (
        <div className="bg-white shadow-xl rounded-lg p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <h2 className="text-xl font-bold text-gray-800">Deleted Log</h2>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by invoice no, driver, rego..."
                        className="w-full md:w-72 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
                    />
                    <button
                        type="button"
                        onClick={load}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {errorMsg && <div className="mb-4 text-red-500 font-semibold">{errorMsg}</div>}

            {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading deleted records...</div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                    {records.length === 0 ? 'No invoices have been deleted yet.' : 'No deleted records match your search.'}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice No.</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice Date</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Driver</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Vehicle</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Rego</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Deleted At</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((rec) => (
                                <tr
                                    key={rec.id}
                                    onClick={() => setSelected(rec)}
                                    className="hover:bg-gray-50 cursor-pointer"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900">{rec.invoice_no}</td>
                                    <td className="px-4 py-3 text-gray-700">{formatDate(rec.invoice_date)}</td>
                                    <td className="px-4 py-3 text-gray-700">{rec.driver_name || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {[rec.make, rec.model].filter(Boolean).join(' ') || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{rec.registration || '-'}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{formatMoney(rec.total_amount)}</td>
                                    <td className="px-4 py-3 text-gray-500">{formatDateTime(rec.deleted_at)}</td>
                                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(rec)}
                                            disabled={deletingId === rec.id}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-60"
                                        >
                                            {deletingId === rec.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <DeletedDetailModal
                    record={selected}
                    onClose={() => setSelected(null)}
                    onDelete={() => handleDelete(selected)}
                    deleting={deletingId === selected.id}
                />
            )}
        </div>
    );
};

const Field = ({ label, value }) => (
    <div>
        <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
        <div className="text-sm text-gray-800">{value === '' || value === null || value === undefined ? '-' : value}</div>
    </div>
);

const Section = ({ title, children }) => (
    <div className="mb-5">
        <h4 className="text-sm font-bold text-red-600 border-b border-red-200 pb-1 mb-3">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
);

const DeletedDetailModal = ({ record, onClose, onDelete, deleting }) => {
    const data = record.data || {};
    const driver = data.driver || {};
    const vehicle = data.vehicle || {};
    const rental = data.rental || {};
    const repairer = data.repairer || {};
    const thirdParty = data.thirdParty || {};
    const inspection = data.inspection || {};
    const b = data.billing || {};
    const money = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(2)}`);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Invoice {data.invoiceNo || record.invoice_no}</h3>
                        <p className="text-xs text-red-600 font-semibold">
                            Deleted {record.deleted_at ? new Date(record.deleted_at).toLocaleString() : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                <div className="p-6">
                    <Section title="General">
                        <Field label="Invoice No." value={data.invoiceNo} />
                        <Field label="Invoice Date" value={data.invoiceDate} />
                        <Field label="Third Party Claim #" value={data.thirdPartyClaimNo} />
                        <Field label="Client Registration" value={data.clientRegistration} />
                        <Field label="Originally Created" value={data.createdAt ? new Date(data.createdAt).toLocaleString() : '-'} />
                    </Section>

                    <Section title="Hirer & Authorised Driver">
                        <Field label="Full Name" value={driver.fullName} />
                        <Field label="Street Address" value={driver.streetAddress} />
                        <Field label="Suburb" value={driver.suburb} />
                        <Field label="State" value={driver.state} />
                        <Field label="Post Code" value={driver.postCode} />
                        <Field label="Mobile" value={driver.mobilePhone} />
                        <Field label="Home Phone" value={driver.homePhone} />
                        <Field label="Work Phone" value={driver.workPhone} />
                        <Field label="DOB" value={driver.dob} />
                        <Field label="Email" value={driver.email} />
                        <Field label="Licence No." value={driver.licenceNo} />
                        <Field label="State of Issue" value={driver.stateOfIssue} />
                        <Field label="Licence Expiry" value={driver.licenceExpiry} />
                    </Section>

                    <Section title="Vehicle & Rental">
                        <Field label="Make" value={vehicle.make} />
                        <Field label="Model" value={vehicle.model} />
                        <Field label="Colour" value={vehicle.colour} />
                        <Field label="Registration" value={vehicle.registration} />
                        <Field label="Date Out" value={rental.dateOut} />
                        <Field label="Time Out" value={rental.timeOut} />
                        <Field label="Date Return" value={rental.dateReturn} />
                        <Field label="Time Return" value={rental.timeReturn} />
                        <Field label="Kms Out" value={rental.kmsOut} />
                        <Field label="Kms Return" value={rental.kmsReturn} />
                        <Field label="Excess Amount" value={rental.excessAmount} />
                        <Field label="Total Days" value={rental.totalDays} />
                    </Section>

                    <Section title="Repairer & Third Party">
                        <Field label="Repairer Name" value={repairer.name} />
                        <Field label="Repairer Phone" value={repairer.phone} />
                        <Field label="Insurance Company" value={thirdParty.insuranceCompany} />
                        <Field label="Claim Number" value={thirdParty.claimNumber} />
                        <Field label="TP Driver Name" value={thirdParty.driverName} />
                        <Field label="Damaged Vehicle Rego" value={thirdParty.damagedVehicleRego} />
                        <Field label="Date of Accident" value={thirdParty.dateOfAccident} />
                    </Section>

                    <Section title="Inspection">
                        <Field label="Fuel Level" value={inspection.fuelLevel} />
                        <Field label="Fuel Type" value={inspection.fuelType} />
                        <Field label="Condition" value={inspection.condition} />
                        <Field label="Inspector" value={inspection.inspectorName} />
                    </Section>

                    <Section title="Billing">
                        <Field label="Daily Rental" value={`${b.dailyRentalDays ?? '-'} days x ${money(b.dailyRentalRate)}`} />
                        <Field label="Excess Reduction" value={`${b.excessReductionDays ?? '-'} days x ${money(b.excessReductionRate)}`} />
                        <Field label="Rego Recovery" value={`${b.registrationRecoveryDays ?? '-'} days x ${money(b.registrationRecoveryRate)}`} />
                        <Field label="Delivery Charge" value={money(b.deliveryCharge)} />
                        <Field label="Sub Total" value={money(b.subTotal)} />
                        <Field label="GST" value={money(b.gst)} />
                        <Field label="Grand Total" value={money(b.grandTotal)} />
                    </Section>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-60"
                    >
                        {deleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeletedInvoiceList;
