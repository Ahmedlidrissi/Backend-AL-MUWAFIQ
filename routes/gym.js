const express = require('express');
const Workout = require('../models/Workout');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/gym/sync
 * Bulk upsert workouts from the frontend.
 * Body: { items: [{ clientSideId, dayOfWeek, exercises, isDeleted }, ...] }
 */
router.post('/sync', async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array is required and must not be empty.' });
        }

        const results = await Promise.all(
            items.map((item) =>
                Workout.findOneAndUpdate(
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
        console.error('Gym sync error:', err);
        res.status(500).json({ error: 'Server error during workout sync.' });
    }
});

/**
 * GET /api/gym
 * Fetch all non-deleted workouts for the authenticated user.
 */
router.get('/', async (req, res) => {
    try {
        const workouts = await Workout.find({
            userId: req.user,
            isDeleted: { $ne: true },
        }).sort({ updatedAt: -1 });

        res.json(workouts);
    } catch (err) {
        console.error('Workout fetch error:', err);
        res.status(500).json({ error: 'Server error fetching workouts.' });
    }
});

module.exports = router;
