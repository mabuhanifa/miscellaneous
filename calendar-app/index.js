const express = require('express');
const PORT = process.env.PORT || 3000;
require('dotenv').config();
const cors = require('cors');
const eventRoutes = require('./routes/event.route.js');
const connectDB = require('./config/db.js')

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

app.use('/api',eventRoutes)

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});