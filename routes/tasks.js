const express = require('express');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/tasks/sync
 * Bulk upsert tasks from the frontend.
 * Body: { items: [{ clientSideId, title, isCompleted, priority, date, isDeleted }, ...] }
 */
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array is required and must not be empty.' });
        }

        const results = await Promise.all(
            items.map((item) =>
                Task.findOneAndUpdate(
                    { userId: req.user, clientSideId: item.clientSideId },
                    {
                        ...item,
                        userId: req.user,
                        updatedAt: Date.now(),
                    },
                    { upsert: true, new: true, runValidators: true }
                )
            )
        );

        res.json({ synced: results.length, items: results });
    } catch (err) {
        console.error('Task sync error:', err);
        res.status(500).json({ error: 'Server error during task sync.' });
    }
});

/**
 * GET /api/tasks
 * Fetch all non-deleted tasks for the authenticated user.
 */
router.get('/', async (req, res) => {
    try {
        const tasks = await Task.find({
            userId: req.user,
            isDeleted: { $ne: true },
        }).sort({ updatedAt: -1 });

        res.json(tasks);
    } catch (err) {
        console.error('Task fetch error:', err);
        res.status(500).json({ error: 'Server error fetching tasks.' });
    }
});

module.exports = router;
