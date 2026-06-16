import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/invoices`;

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : '-');
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');
const formatMoney = (value) =>
    value === null || value === undefined ? '-' : `$${Number(value).toFixed(2)}`;

const InvoiceList = () => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [search, setSearch] = useState('');
    const [downloadingId, setDownloadingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadInvoices = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await axios.get(API_URL);
            setInvoices(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error loading invoices:', error);
            setErrorMsg('Could not load invoices. Make sure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInvoices();
    }, []);

    const openDetails = async (invoice) => {
        setDetailLoading(true);
        setSelected({ id: invoice.id });
        setErrorMsg('');
        try {
            const res = await axios.get(`${API_URL}/${invoice.id}`);
            setSelected(res.data);
        } catch (error) {
            console.error('Error loading invoice details:', error);
            setErrorMsg('Failed to load invoice details.');
            setSelected(null);
        } finally {
            setDetailLoading(false);
        }
    };

    const handleDownload = async (invoice) => {
        setDownloadingId(invoice.id);
        setErrorMsg('');
        try {
            const res = await axios.get(`${API_URL}/${invoice.id}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${invoice.invoice_no || invoice.invoiceNo}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            setErrorMsg('Failed to download this invoice PDF. Please try again.');
        } finally {
            setDownloadingId(null);
        }
    };

    const handleDelete = async (invoice) => {
        const label = invoice.invoice_no || invoice.invoiceNo;
        if (!window.confirm(`Delete invoice "${label}"? This cannot be undone.`)) return;
        setDeletingId(invoice.id);
        setErrorMsg('');
        try {
            await axios.delete(`${API_URL}/${invoice.id}`);
            setInvoices((prev) => prev.filter((inv) => inv.id !== invoice.id));
            if (selected && selected.id === invoice.id) setSelected(null);
        } catch (error) {
            console.error('Error deleting invoice:', error);
            setErrorMsg('Failed to delete this invoice. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return invoices;
        return invoices.filter((inv) =>
            [inv.invoice_no, inv.driver_name, inv.registration, inv.make, inv.model]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(term))
        );
    }, [invoices, search]);

    return (
        <div className="bg-white shadow-xl rounded-lg p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Invoice Log</h2>
                </div>
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
                        onClick={loadInvoices}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {errorMsg && <div className="mb-4 text-red-500 font-semibold">{errorMsg}</div>}

            {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading invoices...</div>
            ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                    {invoices.length === 0 ? 'No invoices have been created yet.' : 'No invoices match your search.'}
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
                                <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filtered.map((inv) => (
                                <tr
                                    key={inv.id}
                                    onClick={() => openDetails(inv)}
                                    className="hover:bg-gray-50 cursor-pointer"
                                >
                                    <td className="px-4 py-3 font-medium text-gray-900">{inv.invoice_no}</td>
                                    <td className="px-4 py-3 text-gray-700">{formatDate(inv.invoice_date)}</td>
                                    <td className="px-4 py-3 text-gray-700">{inv.driver_name || '-'}</td>
                                    <td className="px-4 py-3 text-gray-700">
                                        {[inv.make, inv.model].filter(Boolean).join(' ') || '-'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{inv.registration || '-'}</td>
                                    <td className="px-4 py-3 text-right text-gray-900">{formatMoney(inv.total_amount)}</td>
                                    <td className="px-4 py-3 text-gray-500">{formatDateTime(inv.created_at)}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => handleDownload(inv)}
                                            disabled={downloadingId === inv.id}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                                        >
                                            {downloadingId === inv.id ? 'Preparing...' : 'Download'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(inv)}
                                            disabled={deletingId === inv.id}
                                            className="ml-2 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-60"
                                        >
                                            {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <InvoiceDetailModal
                    invoice={selected}
                    loading={detailLoading}
                    onClose={() => setSelected(null)}
                    onDownload={() => handleDownload(selected)}
                    onDelete={() => handleDelete(selected)}
                    downloading={downloadingId === selected.id}
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

const InvoiceDetailModal = ({ invoice, loading, onClose, onDownload, onDelete, downloading, deleting }) => {
    const ready = !loading && invoice && invoice.driver;
    const b = invoice.billing || {};
    const money = (v) => (v === null || v === undefined ? '-' : `$${Number(v).toFixed(2)}`);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
                    <h3 className="text-lg font-bold text-gray-800">
                        Invoice {ready ? invoice.invoiceNo : ''}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
                        aria-label="Close"
                    >
                        &times;
                    </button>
                </div>

                {!ready ? (
                    <div className="p-10 text-center text-gray-500">Loading details...</div>
                ) : (
                    <div className="p-6">
                        <Section title="General">
                            <Field label="Invoice No." value={invoice.invoiceNo} />
                            <Field label="Invoice Date" value={invoice.invoiceDate} />
                            <Field label="Third Party Claim #" value={invoice.thirdPartyClaimNo} />
                            <Field label="Client Registration" value={invoice.clientRegistration} />
                            <Field label="Created" value={invoice.createdAt ? new Date(invoice.createdAt).toLocaleString() : '-'} />
                        </Section>

                        <Section title="Hirer & Authorised Driver">
                            <Field label="Full Name" value={invoice.driver.fullName} />
                            <Field label="Street Address" value={invoice.driver.streetAddress} />
                            <Field label="Suburb" value={invoice.driver.suburb} />
                            <Field label="State" value={invoice.driver.state} />
                            <Field label="Post Code" value={invoice.driver.postCode} />
                            <Field label="Mobile" value={invoice.driver.mobilePhone} />
                            <Field label="Home Phone" value={invoice.driver.homePhone} />
                            <Field label="Work Phone" value={invoice.driver.workPhone} />
                            <Field label="DOB" value={invoice.driver.dob} />
                            <Field label="Email" value={invoice.driver.email} />
                            <Field label="Licence No." value={invoice.driver.licenceNo} />
                            <Field label="State of Issue" value={invoice.driver.stateOfIssue} />
                            <Field label="Licence Expiry" value={invoice.driver.licenceExpiry} />
                        </Section>

                        <Section title="Vehicle & Rental">
                            <Field label="Make" value={invoice.vehicle.make} />
                            <Field label="Model" value={invoice.vehicle.model} />
                            <Field label="Colour" value={invoice.vehicle.colour} />
                            <Field label="Registration" value={invoice.vehicle.registration} />
                            <Field label="Date Out" value={invoice.rental.dateOut} />
                            <Field label="Time Out" value={invoice.rental.timeOut} />
                            <Field label="Date Return" value={invoice.rental.dateReturn} />
                            <Field label="Time Return" value={invoice.rental.timeReturn} />
                            <Field label="Kms Out" value={invoice.rental.kmsOut} />
                            <Field label="Kms Return" value={invoice.rental.kmsReturn} />
                            <Field label="Excess Amount" value={invoice.rental.excessAmount} />
                            <Field label="Total Days" value={invoice.rental.totalDays} />
                        </Section>

                        <Section title="Repairer & Third Party">
                            <Field label="Repairer Name" value={invoice.repairer.name} />
                            <Field label="Repairer Phone" value={invoice.repairer.phone} />
                            <Field label="Insurance Company" value={invoice.thirdParty.insuranceCompany} />
                            <Field label="Claim Number" value={invoice.thirdParty.claimNumber} />
                            <Field label="TP Driver Name" value={invoice.thirdParty.driverName} />
                            <Field label="Damaged Vehicle Rego" value={invoice.thirdParty.damagedVehicleRego} />
                            <Field label="Date of Accident" value={invoice.thirdParty.dateOfAccident} />
                        </Section>

                        <Section title="Inspection">
                            <Field label="Fuel Level" value={invoice.inspection.fuelLevel} />
                            <Field label="Fuel Type" value={invoice.inspection.fuelType} />
                            <Field label="Condition" value={invoice.inspection.condition} />
                            <Field label="Inspector" value={invoice.inspection.inspectorName} />
                        </Section>

                        <Section title="Billing">
                            <Field label="Daily Rental" value={`${b.dailyRentalDays} days x ${money(b.dailyRentalRate)}`} />
                            <Field label="Excess Reduction" value={`${b.excessReductionDays} days x ${money(b.excessReductionRate)}`} />
                            <Field label="Rego Recovery" value={`${b.registrationRecoveryDays} days x ${money(b.registrationRecoveryRate)}`} />
                            <Field label="Delivery Charge" value={money(b.deliveryCharge)} />
                            <Field label="Sub Total" value={money(b.subTotal)} />
                            <Field label="GST" value={money(b.gst)} />
                            <Field label="Grand Total" value={money(b.grandTotal)} />
                        </Section>
                    </div>
                )}

                <div className="flex justify-end gap-3 px-6 py-4 border-t sticky bottom-0 bg-white">
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-60"
                    >
                        {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={downloading || !ready}
                        className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                    >
                        {downloading ? 'Preparing...' : 'Download PDF'}
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

export default InvoiceList;
