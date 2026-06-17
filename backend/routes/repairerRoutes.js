const express = require('express');
const repairerController = require('../controllers/repairerController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticateToken, repairerController.listRepairers);
router.post('/', authenticateToken, requireAdmin, repairerController.createRepairer);
router.patch('/:id', authenticateToken, requireAdmin, repairerController.updateRepairer);
router.delete('/:id', authenticateToken, requireAdmin, repairerController.deactivateRepairer);

module.exports = router;
