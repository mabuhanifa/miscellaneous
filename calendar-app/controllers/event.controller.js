const Event = require('../models/Event')


const getAllEvents = async (req, res) => {
    try {
        const events = await Event.find({});
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch events" });
    }
};

const createEvent = async (req, res) => {
    const { title, description, startTime, endTime, participants, recurrence } = req.body;
    const createdBy = req.user.userId;

    try {
        const event = new Event({ title, description, startTime, endTime, participants, recurrence, createdBy });
        await event.save();
        res.status(201).json(event);
    } catch (err) {
        res.status(500).json({ error: "Failed to create event" });
        console.error(err.message)
    }
};

const updateEvent = async (req, res) => {
    const { eventId } = req.params;
    const { title, description, startTime, endTime, participants, recurrenceUpdateOption } = req.body;
    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });
        if (recurrenceUpdateOption === "thisEvent") {
            event.title = title || event.title;
            event.description = description || event.description;
            event.startTime = startTime || event.startTime;
            event.endTime = endTime || event.endTime;
            event.participants = participants || event.participants;
            await event.save();
        } else if (recurrenceUpdateOption === "thisAndFollowing") {

        } else if (recurrenceUpdateOption === "allEvents") {
        }
        res.status(200).json(event);
    } catch (err) {
        res.status(500).json({ error: "Failed to update event" });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { recurrenceDeleteOption } = req.body;
        console.log(recurrenceDeleteOption)
        if (!["thisEvent", "thisAndFollowing", "allEvents"].includes(recurrenceDeleteOption)) {

            return res.status(400).json({ message: "Invalid recurrenceDeleteOption" });
        }
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ error: "Event not found" });

        if (recurrenceDeleteOption === "thisEvent") {
            await event.deleteOne()
        } else if (recurrenceDeleteOption === "thisAndFollowing") {
            const seriesId = event.parentEventId || event._id;
            await Event.deleteMany({
                $or: [
                    { _id: event._id },
                    {
                        parentEventId: seriesId,
                        startTime: { $gt: event.startTime },
                    },
                ],
            });
        } else if (recurrenceDeleteOption === "allEvents") {
            const seriesId = event.parentEventId || event._id;
            await Event.deleteMany({
                $or: [
                    { _id: seriesId },
                    { parentEventId: seriesId },
                ],
            });
        }

        res.status(200).json({ message: "Event deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete event" });
        console.log(err.message)
    }
};



module.exports = {
    createEvent, updateEvent, deleteEvent, getAllEvents
}