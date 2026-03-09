const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        category: {
            type: String,
            enum: ['Personal', 'Deen', 'Gym', 'Work'],
            default: 'Personal',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        repeat: {
            type: String,
            enum: ['None', 'Daily', 'Weekly'],
            default: 'None',
        },
        reminderTime: {
            type: String, // 'HH:MM' format
        },
        date: {
            type: String, // 'YYYY-MM-DD'
        },
        lastCompletedAt: {
            type: String, // ISO date string
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
taskSchema.index({ userId: 1, clientSideId: 1 }, { unique: true });

module.exports = mongoose.model('Task', taskSchema);
