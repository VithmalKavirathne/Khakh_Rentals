import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import InvoiceForm from '../components/InvoiceForm';
import InvoiceList from '../components/InvoiceList';
import DeletedInvoiceList from '../components/DeletedInvoiceList';
import VehicleManager from '../components/VehicleManager';
import logo from '../assets/logo.png';

export default function MainLayout() {
  const [view, setView] = useState('create');
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const tabClass = (tab) =>
    `px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
      view === tab
        ? 'bg-red-600 text-white shadow'
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
    }`;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-8">
          <div className="bg-black rounded-xl px-10 py-4 shadow-lg">
            <img src={logo} alt="KHAKH RENTALS" className="h-28 w-auto" />
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3 mb-2">
          <button type="button" onClick={() => setView('create')} className={tabClass('create')}>
            Create Invoice
          </button>
          <button type="button" onClick={() => setView('log')} className={tabClass('log')}>
            Invoice Log
          </button>
          <button type="button" onClick={() => setView('vehicles')} className={tabClass('vehicles')}>
            Vehicles
          </button>
          <button type="button" onClick={() => setView('deleted')} className={tabClass('deleted')}>
            Deleted Log
          </button>
          {isAdmin && (
            <Link
              to="/settings"
              className="px-5 py-2.5 rounded-md text-sm font-semibold transition-colors bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
            >
              Settings
            </Link>
          )}
        </div>

        <div className="flex justify-center items-center gap-4 mb-8 text-sm text-gray-600">
          <span>
            Signed in as <strong className="text-gray-800">{user?.fullName || user?.email}</strong>
            {user?.role === 'admin' && (
              <span className="ml-2 text-xs uppercase tracking-wide text-red-600">Admin</span>
            )}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 font-semibold"
          >
            Log out
          </button>
        </div>

        {view === 'create' && <InvoiceForm />}
        {view === 'log' && <InvoiceList />}
        {view === 'vehicles' && <VehicleManager />}
        {view === 'deleted' && <DeletedInvoiceList />}
      </div>
    </div>
  );
}
