const mongoose = require('mongoose');

const deenLogSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: String, // 'YYYY-MM-DD'
            required: true,
        },
        prayers: {
            type: mongoose.Schema.Types.Mixed, // { Fajr: { state, loggedAt }, ... }
            default: {},
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
deenLogSchema.index({ userId: 1, clientSideId: 1 }, { unique: true });

module.exports = mongoose.model('DeenLog', deenLogSchema);
