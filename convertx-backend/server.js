const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes'); // 1. Import Job Routes
const fileRoutes = require('./routes/fileRoutes');
require('./workers/conversionWorker'); // Initializes background worker listener on startup
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Mount routers
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes); // 2. Mount Job Routes
app.use('/api/files', fileRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Welcome to ConvertX API Core Engine" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});