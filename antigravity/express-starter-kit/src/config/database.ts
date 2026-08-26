import mongoose from 'mongoose';
import config from './index';
import logger from './logger';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Could not connect to MongoDB', error);
    process.exit(1);
  }
};

export default connectDB;
