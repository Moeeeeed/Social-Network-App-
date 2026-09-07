import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import postRoutes from './routes/postroute';

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.use('/api/posts', postRoutes);

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log('Connected to MongoDB!');
  })
  .catch((error) => {
    console.log('Failed to connect to MongoDB:', error);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server is running on port ' + PORT);
});