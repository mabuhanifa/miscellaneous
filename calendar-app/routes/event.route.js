const express = require('express');
const { createEvent, getAllEvents, updateEvent, deleteEvent } = require('../controllers/event.controller');
const { mockAuth, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/event', mockAuth, createEvent);

router.get('/event', getAllEvents);

router.put("/event/:eventId", mockAuth, adminMiddleware, updateEvent);

router.delete("/event/:eventId", mockAuth, adminMiddleware, deleteEvent);


module.exports = router;