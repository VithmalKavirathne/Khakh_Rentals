const testPayload = {
  invoiceNo: 'TEST-' + Date.now(),
  invoiceDate: '2026-05-28',
  thirdPartyClaimNo: 'TP-123',
  clientRegistration: 'CR-123',
  driver: {
    fullName: 'John Doe',
    streetAddress: '123 Test St',
    suburb: 'Testville',
    state: 'VIC',
    postCode: '3000',
    homePhone: '12345678',
    mobilePhone: '0412345678',
    workPhone: '87654321',
    dob: '1990-01-01',
    email: 'john@example.com',
    licenceNo: 'LIC123',
    stateOfIssue: 'VIC',
    licenceExpiry: '2030-01-01'
  },
  vehicle: {
    make: 'Toyota',
    model: 'Camry',
    colour: 'White',
    registration: 'TESTREG'
  },
  rental: {
    dateOut: '2026-05-20',
    timeOut: '10:00',
    dateReturn: '2026-05-25',
    timeReturn: '10:00',
    kmsOut: 10000,
    kmsReturn: 10500,
    excessAmount: 500,
    totalDays: 5
  },
  inspection: {
    fuelLevel: 'FULL',
    fuelType: 'ULP',
    condition: 'CLEAN',
    inspectorName: 'Inspector Gadget'
  },
  billing: {
    dailyRentalDays: 5,
    dailyRentalRate: 50,
    excessReductionDays: 5,
    excessReductionRate: 10,
    registrationRecoveryDays: 5,
    registrationRecoveryRate: 5,
    deliveryCharge: 0,
    subTotal: 325,
    gst: 32.5,
    grandTotal: 357.5
  }
};

fetch('http://localhost:5000/api/invoices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(testPayload)
})
  .then(async res => {
    if (!res.ok) {
      const text = await res.text();
      console.error('FAILED!', res.status, text);
    } else {
      console.log('SUCCESS!');
    }
  })
  .catch(err => console.error('FAILED!', err.message));
