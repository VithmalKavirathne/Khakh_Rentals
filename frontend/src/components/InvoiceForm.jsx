import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import SignaturePad from './SignaturePad';
import { API_BASE_URL } from '../config';

const REPAIRERS_API = `${API_BASE_URL}/api/repairers`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(v) || 0;
const money = (v) => `$${num(v).toFixed(2)}`;

const formatRentalConflictMessage = (conflict) => {
    if (!conflict) {
        return 'Vehicle is already rented for the selected dates. Please choose another vehicle or different dates.';
    }
    return `Vehicle is already rented from ${conflict.dateOut} to ${conflict.dateReturn} on invoice ${conflict.invoiceNo}. Please choose another vehicle or different dates.`;
};

const parseInvoiceError = async (error) => {
    let message = 'Failed to generate invoice. Please try again.';
    const errData = error?.response?.data;

    if (errData instanceof Blob) {
        try {
            const parsed = JSON.parse(await errData.text());
            if (parsed?.conflict) {
                return formatRentalConflictMessage(parsed.conflict);
            }
            if (parsed?.error) {
                return parsed.error;
            }
        } catch {
            return message;
        }
    }

    if (errData?.conflict) {
        return formatRentalConflictMessage(errData.conflict);
    }
    if (errData?.error) {
        return errData.error;
    }

    return message;
};

const InvoiceForm = () => {
    const defaultValues = {
        invoiceDate: todayStr(),
        rental: { excessAmount: 850 },
        inspection: { fuelLevel: 'FULL', fuelType: 'ULP', condition: 'WASHED VACCUMED' },
        billing: {
            dailyRentalDays: 0, dailyRentalRate: 0,
            excessReductionDays: 0, excessReductionRate: 11,
            registrationRecoveryDays: 0, registrationRecoveryRate: 40,
            deliveryCharge: 75
        }
    };

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({ defaultValues });
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [regLookupMsg, setRegLookupMsg] = useState('');
    const [vehicleId, setVehicleId] = useState(null);
    const [availabilityMsg, setAvailabilityMsg] = useState('');
    const [prevInvoiceNo, setPrevInvoiceNo] = useState('');
    const [signature, setSignature] = useState('');
    const [signResetKey, setSignResetKey] = useState(0);
    const [repairers, setRepairers] = useState([]);
    const [repairersLoading, setRepairersLoading] = useState(true);

    // Load the previous invoice number so it can be shown as a hint inside the box.
    const loadLatestInvoiceNo = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/invoices/latest`);
            if (res.data?.invoiceNo) {
                setPrevInvoiceNo(res.data.invoiceNo);
            }
        } catch {
            // ignore - just won't show a hint
        }
    };

    useEffect(() => {
        loadLatestInvoiceNo();
    }, []);

    const loadRepairers = async () => {
        setRepairersLoading(true);
        try {
            const res = await axios.get(REPAIRERS_API);
            setRepairers(Array.isArray(res.data?.repairers) ? res.data.repairers : []);
        } catch {
            setRepairers([]);
        } finally {
            setRepairersLoading(false);
        }
    };

    useEffect(() => {
        loadRepairers();
    }, []);

    // Auto-calculate Total Days from Date Out / Date Return.
    const dateOut = watch('rental.dateOut');
    const dateReturn = watch('rental.dateReturn');
    const invoiceNo = watch('invoiceNo');
    const registration = watch('vehicle.registration');
    useEffect(() => {
        if (dateOut && dateReturn) {
            const diff = Math.round((new Date(dateReturn) - new Date(dateOut)) / 86400000);
            setValue('rental.totalDays', diff > 0 ? diff : 0);
        }
    }, [dateOut, dateReturn, setValue]);

    useEffect(() => {
        setVehicleId(null);
        setAvailabilityMsg('');
    }, [registration]);

    useEffect(() => {
        let cancelled = false;

        if (!vehicleId || !dateOut || !dateReturn) {
            setAvailabilityMsg('');
            return undefined;
        }

        const timer = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ dateOut, dateReturn });
                if (invoiceNo?.trim()) {
                    params.set('excludeInvoiceNo', invoiceNo.trim());
                }

                const res = await axios.get(
                    `${API_BASE_URL}/api/vehicles/id/${vehicleId}/availability?${params.toString()}`
                );

                if (cancelled) return;

                if (!res.data?.available) {
                    setAvailabilityMsg(
                        res.data?.conflict
                            ? formatRentalConflictMessage(res.data.conflict)
                            : (res.data?.message || 'Vehicle is not available for these dates.')
                    );
                } else {
                    setAvailabilityMsg('');
                }
            } catch {
                if (!cancelled) {
                    setAvailabilityMsg('');
                }
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [vehicleId, dateOut, dateReturn, invoiceNo]);

    // Keep Billing day fields (Daily / Excess / Rego) in sync with Total Days.
    const totalDays = watch('rental.totalDays');
    useEffect(() => {
        if (totalDays !== undefined && totalDays !== null && totalDays !== '') {
            setValue('billing.dailyRentalDays', totalDays);
            setValue('billing.excessReductionDays', totalDays);
            setValue('billing.registrationRecoveryDays', totalDays);
        }
    }, [totalDays, setValue]);

    const acknowledged = watch('acknowledged');

    // The acknowledgement can only be ticked after a signature exists.
    // If the signature is cleared, drop the acknowledgement too.
    useEffect(() => {
        if (!signature) {
            setValue('acknowledged', false);
        }
    }, [signature, setValue]);

    // Live billing breakdown shown before saving.
    const billing = watch('billing') || {};
    const dailyAmount = num(billing.dailyRentalDays) * num(billing.dailyRentalRate);
    const excessAmount = num(billing.excessReductionDays) * num(billing.excessReductionRate);
    const regoAmount = num(billing.registrationRecoveryDays) * num(billing.registrationRecoveryRate);
    const deliveryAmount = num(billing.deliveryCharge);
    const subTotalLive = dailyAmount + excessAmount + regoAmount + deliveryAmount;
    const gstLive = subTotalLive * 0.1;
    const grandTotalLive = subTotalLive + gstLive;

    const startNewInvoice = () => {
        reset(defaultValues);
        setValue('invoiceDate', todayStr());
        setErrorMsg('');
        setSuccessMsg('');
        setRegLookupMsg('');
        setVehicleId(null);
        setAvailabilityMsg('');
        setSignature('');
        setSignResetKey((k) => k + 1);
    };

    // Auto-fill vehicle details from a previously registered vehicle.
    const lookupVehicle = async (registration) => {
        const rego = (registration || '').trim();
        if (!rego) {
            setRegLookupMsg('');
            setVehicleId(null);
            return;
        }
        try {
            const res = await axios.get(`${API_BASE_URL}/api/vehicles/${encodeURIComponent(rego)}`);
            const v = res.data;
            setVehicleId(v.id || null);
            setValue('vehicle.make', v.make || '', { shouldValidate: true });
            setValue('vehicle.model', v.model || '', { shouldValidate: true });
            setValue('vehicle.colour', v.colour || '', { shouldValidate: true });
            setRegLookupMsg('Registered vehicle found — details filled automatically.');
        } catch (error) {
            setVehicleId(null);
            if (error?.response?.status === 404) {
                setRegLookupMsg('No registered vehicle for this number. Enter details manually or register it under the Vehicles tab.');
            } else {
                setRegLookupMsg('');
            }
        }
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        setErrorMsg('');

        // Normalize billing inputs from form strings before calculations.
        const dailyRentalDays = Number(data.billing.dailyRentalDays) || 0;
        const dailyRentalRate = Number(data.billing.dailyRentalRate) || 0;
        const excessReductionDays = Number(data.billing.excessReductionDays) || 0;
        const excessReductionRate = Number(data.billing.excessReductionRate) || 0;
        const registrationRecoveryDays = Number(data.billing.registrationRecoveryDays) || 0;
        const registrationRecoveryRate = Number(data.billing.registrationRecoveryRate) || 0;
        const deliveryCharge = Number(data.billing.deliveryCharge) || 0;

        // Calculate totals before sending
        const subTotal = (dailyRentalDays * dailyRentalRate) +
            (excessReductionDays * excessReductionRate) +
            (registrationRecoveryDays * registrationRecoveryRate) +
            deliveryCharge;
        const gst = subTotal * 0.1;
        const grandTotal = subTotal + gst;

        const payload = {
            ...data,
            signature,
            acknowledged: data.acknowledged === true,
            billing: {
                ...data.billing,
                dailyRentalDays,
                dailyRentalRate,
                excessReductionDays,
                excessReductionRate,
                registrationRecoveryDays,
                registrationRecoveryRate,
                deliveryCharge,
                subTotal,
                gst,
                grandTotal
            }
        };

        try {
            const response = await axios.post(`${API_BASE_URL}/api/invoices`, payload, {
                responseType: 'blob'
            });

            // Handle file download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${data.invoiceNo}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setPrevInvoiceNo(data.invoiceNo);
            setSuccessMsg('Invoice downloaded. Spotted a mistake? Edit any field and click "Save & Download Invoice" again to update it.');
            setTimeout(() => setSuccessMsg(''), 7000);
        } catch (error) {
            console.error('Error generating invoice:', error);
            setErrorMsg(await parseInvoiceError(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow-xl rounded-lg p-8">
            {errorMsg && <div className="mb-4 text-red-500 font-semibold">{errorMsg}</div>}
            {successMsg && <div className="mb-4 text-green-600 font-bold">{successMsg}</div>}

            {/* General Info */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">General Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice No.</label>
                    <input
                        type="text"
                        {...register('invoiceNo', { required: true })}
                        placeholder={prevInvoiceNo ? `Previous: ${prevInvoiceNo}` : ''}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border placeholder-gray-400 placeholder:font-light"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                    <input type="date" {...register('invoiceDate', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Third Party Claim #</label>
                    <input type="text" {...register('thirdPartyClaimNo')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Client Registration</label>
                    <input type="text" {...register('clientRegistration')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border" />
                </div>
            </div>

            {/* Driver Details */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Hirer & Authorised Driver</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" {...register('driver.fullName', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input type="text" {...register('driver.streetAddress')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Suburb</label>
                    <input type="text" {...register('driver.suburb')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input type="text" {...register('driver.state')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Post Code</label>
                    <input type="text" {...register('driver.postCode')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mobile Phone</label>
                    <input type="text" {...register('driver.mobilePhone', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Home Phone</label>
                    <input type="text" {...register('driver.homePhone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Work Phone</label>
                    <input type="text" {...register('driver.workPhone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">DOB</label>
                    <input type="date" {...register('driver.dob')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" {...register('driver.email')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Licence No.</label>
                    <input type="text" {...register('driver.licenceNo', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">State of Issue</label>
                    <input type="text" {...register('driver.stateOfIssue')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Licence Expiry</label>
                    <input type="date" {...register('driver.licenceExpiry')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
            </div>

            {/* Vehicle Details */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Vehicle & Rental Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Make</label>
                    <input type="text" {...register('vehicle.make', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Model</label>
                    <input type="text" {...register('vehicle.model', { required: true })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Colour</label>
                    <input type="text" {...register('vehicle.colour')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Registration</label>
                    <input
                        type="text"
                        {...register('vehicle.registration', {
                            required: true,
                            onBlur: (e) => lookupVehicle(e.target.value)
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                    />
                    {regLookupMsg && (
                        <p className={`text-xs mt-1 ${regLookupMsg.startsWith('Registered') ? 'text-green-600' : 'text-gray-500'}`}>
                            {regLookupMsg}
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Date Out</label>
                    <input type="date" {...register('rental.dateOut')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Time Out</label>
                    <input type="time" {...register('rental.timeOut')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Date Return</label>
                    <input type="date" {...register('rental.dateReturn')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Time Return</label>
                    <input type="time" {...register('rental.timeReturn')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Kms Out</label>
                    <input type="number" {...register('rental.kmsOut')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Kms Return</label>
                    <input type="number" {...register('rental.kmsReturn')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Excess Amount</label>
                    <input type="number" step="0.01" {...register('rental.excessAmount')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Total Days</label>
                    <input type="number" {...register('rental.totalDays')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-gray-50" />
                </div>
                {availabilityMsg && (
                    <div className="md:col-span-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {availabilityMsg}
                    </div>
                )}
            </div>

            {/* Repairer & Third Party Details */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Repairer & Third Party</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Repairer */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Repairer Details</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Repairer Name</label>
                            <select {...register('repairer.name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border bg-white">
                                <option value="">-- Select Repairer --</option>
                                {repairers.map((repairer) => (
                                    <option key={repairer.id} value={repairer.name}>{repairer.name}</option>
                                ))}
                            </select>
                            {repairersLoading && (
                                <p className="text-xs text-gray-500 mt-1">Loading repairer centers...</p>
                            )}
                            {!repairersLoading && repairers.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">No repairer centers available. Ask an admin to add centers in Settings.</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Repairer Phone</label>
                            <input type="text" {...register('repairer.phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                    </div>
                </div>

                {/* Third Party */}
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Third Party Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Insurance Company</label>
                            <input type="text" {...register('thirdParty.insuranceCompany')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Claim Number</label>
                            <input type="text" {...register('thirdParty.claimNumber')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Driver Name</label>
                            <input type="text" {...register('thirdParty.driverName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Damaged Vehicle Rego</label>
                            <input type="text" {...register('thirdParty.damagedVehicleRego')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date of Accident</label>
                            <input type="date" {...register('thirdParty.dateOfAccident')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Inspection */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Inspection</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fuel Level</label>
                    <input type="text" {...register('inspection.fuelLevel')} defaultValue="FULL" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                    <input type="text" {...register('inspection.fuelType')} defaultValue="ULP" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Condition</label>
                    <input type="text" {...register('inspection.condition')} defaultValue="WASHED VACCUMED" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                </div>
            </div>

            {/* Billing */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Billing Breakdowns</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Daily Days</label>
                        <input type="number" {...register('billing.dailyRentalDays')} defaultValue={0} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Daily Rate</label>
                        <input type="number" step="0.01" {...register('billing.dailyRentalRate')} defaultValue={0} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Excess Days</label>
                        <input type="number" {...register('billing.excessReductionDays')} defaultValue={0} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Excess Rate</label>
                        <input type="number" step="0.01" {...register('billing.excessReductionRate')} defaultValue={11} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Rego Days</label>
                        <input type="number" {...register('billing.registrationRecoveryDays')} defaultValue={0} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Rego Rate</label>
                        <input type="number" step="0.01" {...register('billing.registrationRecoveryRate')} defaultValue={40} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="w-1/2">
                        <label className="block text-sm font-medium text-gray-700">Delivery Charge</label>
                        <input type="number" step="0.01" {...register('billing.deliveryCharge')} defaultValue={75} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
                    </div>
                </div>
            </div>

            {/* Live Billing Breakdown (preview before saving) */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Billing Summary</h2>
            <div className="mb-8 overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-md">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Item</th>
                            <th className="px-4 py-2 text-center font-semibold text-gray-600">Calculation</th>
                            <th className="px-4 py-2 text-right font-semibold text-gray-600">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        <tr>
                            <td className="px-4 py-2 text-gray-700">Daily Rental</td>
                            <td className="px-4 py-2 text-center text-gray-500">{num(billing.dailyRentalDays)} days &times; {money(billing.dailyRentalRate)}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{money(dailyAmount)}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-gray-700">Excess Reduction</td>
                            <td className="px-4 py-2 text-center text-gray-500">{num(billing.excessReductionDays)} days &times; {money(billing.excessReductionRate)}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{money(excessAmount)}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-gray-700">Registration Recovery</td>
                            <td className="px-4 py-2 text-center text-gray-500">{num(billing.registrationRecoveryDays)} days &times; {money(billing.registrationRecoveryRate)}</td>
                            <td className="px-4 py-2 text-right text-gray-900">{money(regoAmount)}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-2 text-gray-700">Delivery</td>
                            <td className="px-4 py-2 text-center text-gray-500">&mdash;</td>
                            <td className="px-4 py-2 text-right text-gray-900">{money(deliveryAmount)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>Sub Total</td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">{money(subTotalLive)}</td>
                        </tr>
                        <tr className="bg-gray-50">
                            <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>GST (10%)</td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">{money(gstLive)}</td>
                        </tr>
                        <tr className="bg-red-600 text-white">
                            <td className="px-4 py-2 font-bold" colSpan={2}>Grand Total</td>
                            <td className="px-4 py-2 text-right font-bold">{money(grandTotalLive)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Customer Signature & Acknowledgement */}
            <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Customer Signature</h2>
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">Hirer's Signature</label>
                <SignaturePad key={signResetKey} onChange={setSignature} />

                <label className={`flex items-start gap-2 mt-4 text-sm ${signature ? 'text-gray-700' : 'text-gray-400 cursor-not-allowed'}`}>
                    <input
                        type="checkbox"
                        disabled={!signature}
                        {...register('acknowledged', { required: true })}
                        className="mt-0.5 h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500 disabled:cursor-not-allowed"
                    />
                    <span>
                        I acknowledge that I have read, understood and agree to the Terms &amp; Conditions and
                        Declaration Authority of this rental agreement.
                    </span>
                </label>
                {signature && errors.acknowledged && (
                    <p className="text-xs text-red-500 mt-1">
                        You must tick this box before the invoice can be generated.
                    </p>
                )}
            </div>

            <div className="pt-5 border-t border-gray-200 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={startNewInvoice}
                    disabled={isLoading}
                    className="inline-flex justify-center py-3 px-6 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                >
                    New Invoice
                </button>
                <button
                    type="submit"
                    disabled={isLoading || !acknowledged}
                    className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating PDF...' : 'Save & Download Invoice'}
                </button>
            </div>
        </form>
    );
};

export default InvoiceForm;
