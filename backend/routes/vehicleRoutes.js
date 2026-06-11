const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');

// List all registered vehicles
router.get('/', vehicleController.listVehicles);

// Register (or update) a vehicle
router.post('/', vehicleController.registerVehicle);

// Look up a single vehicle by registration (for invoice auto-fill)
router.get('/:registration', vehicleController.getVehicleByRegistration);

// Delete a registered vehicle
router.delete('/:id', vehicleController.deleteVehicle);

module.exports = router;
