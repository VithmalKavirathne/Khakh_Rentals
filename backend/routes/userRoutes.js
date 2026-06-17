const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.get('/', userController.listUsers);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deactivateUser);

module.exports = router;
