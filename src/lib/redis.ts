import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.log('⚠️ Redis: Max retries reached. Real-time updates via Redis disabled.');
        return false; // Stop retrying
      }
      return 5000; // Retry every 5 seconds
    }
  }
});

let isRedisConnected = false;

redisClient.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    // Suppress console spam for connection refused
    return;
  }
  console.error('Redis Client Error', err);
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      isRedisConnected = true;
      console.log('✅ Redis Connected');
    }
  } catch (error) {
    console.log('⚠️ Redis: Connection failed. Using WebSocket-only fallback for real-time updates.');
    isRedisConnected = false;
  }
};

export const getIsRedisConnected = () => isRedisConnected;

export default redisClient;
