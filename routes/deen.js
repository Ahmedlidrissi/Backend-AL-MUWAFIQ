const express = require('express');
const deenController = require('../controllers/deenController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => deenController.getAll(req, res));
router.post('/sync', (req, res) => deenController.sync(req, res));

module.exports = router;
