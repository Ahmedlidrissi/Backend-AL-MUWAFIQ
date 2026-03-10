const express = require('express');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => taskController.getAll(req, res));
router.post('/sync', (req, res) => taskController.sync(req, res));

module.exports = router;
