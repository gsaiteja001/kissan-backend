// middlewares/checkApiKey.js
module.exports = function checkApiKey(req, res, next) {
    // 1. The header name can be 'x-api-key' or 'authorization' or something else
    const clientApiKey = req.headers['x-api-key'] || req.query.apiKey;
  
    console.log("Provided API key:", clientApiKey);
    console.log("Expected API key:", process.env.API_KEY);
    // 2. The server’s key is stored in your environment variables
    //    e.g., process.env.API_KEY
    const serverApiKey = process.env.API_KEY;
  
    if (!clientApiKey) {
      return res.status(401).json({ error: 'API Key missing' });
    }
  
    if (clientApiKey !== serverApiKey) {
      return res.status(403).json({ error: 'Invalid API Key' });
    }
  
    // If the key matches, proceed to the next middleware or route
    next();
  };
  