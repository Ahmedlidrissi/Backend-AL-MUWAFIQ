const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
    {
        name: { type: String, required: false },
        exerciseId: { type: String, required: false },
        sets: { type: mongoose.Schema.Types.Mixed, default: [] },
        reps: { type: mongoose.Schema.Types.Mixed, default: '' },
    },
    { _id: false }
);

const workoutSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        dayOfWeek: {
            type: String,
            required: true,
        },
        exercises: {
            type: [exerciseSchema],
            default: [],
        },
        clientSideId: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Compound unique index for upsert strategy
workoutSchema.index({ userId: 1, clientSideId: 1 }, { unique: true });

module.exports = mongoose.model('Workout', workoutSchema);
