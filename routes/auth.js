const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));
router.post('/change-password', authMiddleware, (req, res) => authController.changePassword(req, res));

module.exports = router;
