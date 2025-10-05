import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import reviewRoutes from './routes/review-routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' })); 

app.use('/api', reviewRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Code reviewer API is running' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });