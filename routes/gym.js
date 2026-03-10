const express = require('express');
const gymController = require('../controllers/gymController');
const gymProgramController = require('../controllers/gymProgramController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Workout logs (completion tracking)
router.get('/', (req, res) => gymController.getAll(req, res));
router.post('/sync', (req, res) => gymController.sync(req, res));

// Program templates (exercises, sequences, etc.)
router.get('/program', (req, res) => gymProgramController.getProgram(req, res));
router.post('/program/sync', (req, res) => gymProgramController.syncProgram(req, res));
router.delete('/program', (req, res) => gymProgramController.deleteProgram(req, res));

module.exports = router;
