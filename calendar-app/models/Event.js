const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    participants: [{ type: String }],
    recurrence: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
    },
    parentEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    createdBy: { type: String, required: true },
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
