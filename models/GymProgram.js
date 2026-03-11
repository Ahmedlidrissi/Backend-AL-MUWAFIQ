const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
    {
        id: { type: String, required: false },
        name: { type: String, required: false },
        sets: { type: mongoose.Schema.Types.Mixed, default: [] },
        reps: { type: mongoose.Schema.Types.Mixed, default: '' },
    },
    { _id: false }
);

const routineTemplateSchema = new mongoose.Schema(
    {
        isRestDay: { type: Boolean, default: false },
        name: { type: String, required: true },
        exercises: { type: [exerciseSchema], default: [] },
    },
    { _id: false }
);

const gymProgramSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        clientSideId: {
            type: String,
            required: true,
        },
        programName: { type: String, default: '' },
        anchorDate: { type: String, default: '' },
        sequence: { type: [String], default: [] },
        routineTemplates: { type: Map, of: routineTemplateSchema, default: {} },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound unique index for upsert strategy
gymProgramSchema.index({ userId: 1, clientSideId: 1 }, { unique: true });

module.exports = mongoose.model('GymProgram', gymProgramSchema);
