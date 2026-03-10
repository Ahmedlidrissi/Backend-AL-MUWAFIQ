const GymProgram = require('../models/GymProgram');

class GymProgramController {
    /**
     * GET /api/gym/program
     * Fetch the user's gym program setup (templates, sequence, etc.)
     */
    async getProgram(req, res) {
        try {
            const program = await GymProgram.findOne({
                userId: req.user,
                isDeleted: { $ne: true },
            }).sort({ updatedAt: -1 });

            if (!program) {
                return res.json(null);
            }

            // Convert Map to plain object for JSON response
            const routineTemplates = {};
            if (program.routineTemplates) {
                for (const [key, value] of program.routineTemplates) {
                    routineTemplates[key] = value;
                }
            }

            res.json({
                clientSideId: program.clientSideId,
                programName: program.programName,
                anchorDate: program.anchorDate,
                sequence: program.sequence,
                routineTemplates,
            });
        } catch (err) {
            console.error('Gym program fetch error:', err);
            res.status(500).json({ error: 'Server error fetching gym program.' });
        }
    }

    /**
     * POST /api/gym/program/sync
     * Upsert the user's gym program setup     * Body:
 { clientSideId, programName, anchorDate, sequence, routineTemplates }
     */
    async syncProgram(req, res) {
        try {
            const { clientSideId, programName, anchorDate, sequence, routineTemplates } = req.body;

            if (!clientSideId) {
                return res.status(400).json({ error: 'clientSideId is required.' });
            }

            // Convert routineTemplates object to Map for Mongoose
            const templatesMap = new Map();
            if (routineTemplates && typeof routineTemplates === 'object') {
                for (const [key, value] of Object.entries(routineTemplates)) {
                    templatesMap.set(key, value);
                }
            }

            const program = await GymProgram.findOneAndUpdate(
                { userId: req.user, clientSideId },
                {
                    userId: req.user,
                    clientSideId,
                    programName: programName || '',
                    anchorDate: anchorDate || '',
                    sequence: sequence || [],
                    routineTemplates: templatesMap,
                    updatedAt: Date.now(),
                },
                { upsert: true, new: true, runValidators: true }
            );

            // Convert Map to plain object for response
            const responseTemplates = {};
            if (program.routineTemplates) {
                for (const [key, value] of program.routineTemplates) {
                    responseTemplates[key] = value;
                }
            }

            res.json({
                clientSideId: program.clientSideId,
                programName: program.programName,
                anchorDate: program.anchorDate,
                sequence: program.sequence,
                routineTemplates: responseTemplates,
            });
        } catch (err) {
            console.error('Gym program sync error:', err);
            res.status(500).json({ error: 'Server error syncing gym program.' });
        }
    }

    /**
     * DELETE /api/gym/program
     * Soft delete the user's gym program
     */
    async deleteProgram(req, res) {
        try {
            const { clientSideId } = req.body;

            if (!clientSideId) {
                return res.status(400).json({ error: 'clientSideId is required.' });
            }

            await GymProgram.findOneAndUpdate(
                { userId: req.user, clientSideId },
                { isDeleted: true, updatedAt: Date.now() }
            );

            res.json({ message: 'Gym program deleted.' });
        } catch (err) {
            console.error('Gym program delete error:', err);
            res.status(500).json({ error: 'Server error deleting gym program.' });
        }
    }
}

module.exports = new GymProgramController();
