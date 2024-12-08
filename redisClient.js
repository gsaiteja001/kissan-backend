
const redis = require('redis');

// Create a Redis client
const client = redis.createClient({
  url: 'rediss://red-ct9a1h9u0jms73co0se0:yIpwHFiRuiNt6F28eDUBxDaEhpvoEiTY@singapore-redis.render.com:6379', // Update with your Redis URL
});

// Connect to Redis
client.connect()
  .then(() => {
    console.log('Connected to Redis successfully.');
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
  });

// Handle Redis errors
client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

// Export getAsync and setAsync functions
module.exports = {
  getAsync: async (key) => {
    try {
      const value = await client.get(key);
      return value;
    } catch (error) {
      console.error('Error getting key from Redis:', error);
      return null;
    }
  },
  setAsync: async (key, expirationInSeconds, value) => {
    try {
      await client.set(key, value, {
        EX: expirationInSeconds, // Expiration time in seconds
      });
    } catch (error) {
      console.error('Error setting key in Redis:', error);
    }
  },
};
