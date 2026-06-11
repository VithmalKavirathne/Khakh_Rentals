const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');

// Route to create a new invoice and generate PDF
router.post('/', invoiceController.createInvoice);

// List all saved invoices (invoice log)
router.get('/', invoiceController.listInvoices);

// Most recent invoice number (must be registered before '/:id')
router.get('/latest', invoiceController.getLatestInvoiceNo);

// Log of deleted invoices (must be registered before '/:id')
router.get('/deleted', invoiceController.listDeletedInvoices);

// Re-generate and download an existing invoice's PDF
router.get('/:id/pdf', invoiceController.downloadInvoice);

// Get full details for a single invoice
router.get('/:id', invoiceController.getInvoice);

// Permanently remove a record from the deleted log (before '/:id')
router.delete('/deleted/:id', invoiceController.deleteDeletedInvoice);

// Delete an invoice (archives it to the deleted log)
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
