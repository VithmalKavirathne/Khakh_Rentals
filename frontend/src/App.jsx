import React, { useState } from 'react';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import DeletedInvoiceList from './components/DeletedInvoiceList';
import VehicleManager from './components/VehicleManager';
import logo from './assets/logo.png';

function App() {
  const [view, setView] = useState('create');

  const tabClass = (tab) =>
    `px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
      view === tab
        ? 'bg-red-600 text-white shadow'
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center mb-8">
          <div className="bg-black rounded-xl px-10 py-4 shadow-lg">
            <img src={logo} alt="KHAKH RENTALS" className="h-28 w-auto" />
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8">
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
        </div>

        {view === 'create' && <InvoiceForm />}
        {view === 'log' && <InvoiceList />}
        {view === 'vehicles' && <VehicleManager />}
        {view === 'deleted' && <DeletedInvoiceList />}
      </div>
    </div>
  );
}

export default App;
