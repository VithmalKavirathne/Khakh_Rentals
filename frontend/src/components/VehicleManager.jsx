import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api/vehicles`;

const VehicleManager = () => {
    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [search, setSearch] = useState('');

    const load = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const res = await axios.get(API_URL);
            setVehicles(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error loading vehicles:', error);
            setErrorMsg('Could not load vehicles. Make sure the backend server is running.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onSubmit = async (data) => {
        setSaving(true);
        setErrorMsg('');
        setSuccessMsg('');
        try {
            const res = await axios.post(API_URL, data);
            setSuccessMsg(`Vehicle "${res.data.registration}" registered successfully.`);
            setTimeout(() => setSuccessMsg(''), 5000);
            reset();
            load();
        } catch (error) {
            console.error('Error registering vehicle:', error);
            setErrorMsg(error?.response?.data?.error || 'Failed to register vehicle. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (vehicle) => {
        if (!window.confirm(`Delete registered vehicle "${vehicle.registration}"?`)) return;
        setDeletingId(vehicle.id);
        setErrorMsg('');
        try {
            await axios.delete(`${API_URL}/${vehicle.id}`);
            setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            setErrorMsg(error?.response?.data?.error || 'Failed to delete vehicle.');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return vehicles;
        return vehicles.filter((v) =>
            [v.registration, v.make, v.model, v.colour]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(term))
        );
    }, [vehicles, search]);

    const inputClass = 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border';

    return (
        <div className="space-y-8">
            <div className="bg-white shadow-xl rounded-lg p-8">
                <h2 className="text-xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-gray-800">Register a Vehicle</h2>

                {errorMsg && <div className="mb-4 text-red-500 font-semibold">{errorMsg}</div>}
                {successMsg && <div className="mb-4 text-green-600 font-bold">{successMsg}</div>}

                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Registration</label>
                            <input type="text" {...register('registration', { required: true })} className={inputClass} />
                            {errors.registration && <p className="text-xs text-red-500 mt-1">Registration is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Make</label>
                            <input type="text" {...register('make', { required: true })} className={inputClass} />
                            {errors.make && <p className="text-xs text-red-500 mt-1">Make is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Model</label>
                            <input type="text" {...register('model', { required: true })} className={inputClass} />
                            {errors.model && <p className="text-xs text-red-500 mt-1">Model is required</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Colour</label>
                            <input type="text" {...register('colour')} className={inputClass} />
                        </div>
                    </div>
                    <div className="pt-5 mt-4 border-t border-gray-200 text-right">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                        >
                            {saving ? 'Registering...' : 'Register Vehicle'}
                        </button>
                    </div>
                </form>
                <p className="text-xs text-gray-500 mt-3">
                    Registering an existing registration number updates its details.
                </p>
            </div>

            <div className="bg-white shadow-xl rounded-lg p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Registered Vehicles</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by rego, make, model..."
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

                {isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading vehicles...</div>
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                        {vehicles.length === 0 ? 'No vehicles registered yet.' : 'No vehicles match your search.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Registration</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Make</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Model</th>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Colour</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{v.registration}</td>
                                        <td className="px-4 py-3 text-gray-700">{v.make}</td>
                                        <td className="px-4 py-3 text-gray-700">{v.model}</td>
                                        <td className="px-4 py-3 text-gray-700">{v.colour || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(v)}
                                                disabled={deletingId === v.id}
                                                className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-60"
                                            >
                                                {deletingId === v.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleManager;
