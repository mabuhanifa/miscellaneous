
const Event = require('../models/Event')

const mockAuth = (req, res, next) => {
    req.user = { userId: "admin" };
    next();
};

const adminMiddleware = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const eventId = req.params.eventId;

        const event = await Event.findById(eventId);

        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }

        if (event.createdBy === userId || userId === "admin") {
            next();
        } else {
            res.status(403).json({ error: "Unauthorized" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
};

module.exports = { mockAuth, adminMiddleware };