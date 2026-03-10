const DeenLog = require('../models/DeenLog');

class DeenController {
    /**
     * GET /api/deen
     * Fetch all non-deleted deen logs for the authenticated user.
     */
    async getAll(req, res) {
        try {
            const logs = await DeenLog.find({
                userId: req.user,
                isDeleted: { $ne: true },
            }).sort({ date: -1 });

            res.json(logs);
        } catch (err) {
            console.error('DeenLog fetch error:', err);
            res.status(500).json({ error: 'Server error fetching deen logs.' });
        }
    }

    /**
     * POST /api/deen/sync
     * Bulk upsert deen logs (prayer data) from the frontend.
     * Body: { items: [{ clientSideId, date, prayers, isDeleted }, ...] }
     */
    async sync(req, res) {
        try {
            const { items } = req.body;

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'items array is required and must not be empty.' });
            }

            const results = await Promise.all(
                items.map((item) =>
                    DeenLog.findOneAndUpdate(
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
            console.error('Deen sync error:', err);
            res.status(500).json({ error: 'Server error during deen log sync.' });
        }
    }
}

module.exports = new DeenController();
