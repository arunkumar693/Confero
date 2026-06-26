const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer = null;

const connectDB = async () => {
  const isLocal = process.env.MONGO_URI && process.env.MONGO_URI.includes("127.0.0.1") || process.env.MONGO_URI.includes("localhost");
  
  try {
    // Try to connect to the provided URI first
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.warn(`⚠️  MongoDB connection to ${process.env.MONGO_URI} failed: ${err.message}`);
    
    if (isLocal && process.env.NODE_ENV !== "production") {
      // If it fails, fallback to in-memory server
      console.log("🔄  Falling back to in-memory MongoDB for development...");
      try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        const conn = await mongoose.connect(mongoUri);
        console.log(`✅  In-Memory MongoDB connected: ${mongoUri}`);
        return conn;
      } catch (memoryErr) {
        console.error(`❌  In-Memory MongoDB failed to start: ${memoryErr.message}`);
        process.exit(1);
      }
    } else {
      console.error("❌  Could not connect to MongoDB and fallback is disabled.");
      process.exit(1);
    }
  }
};

const closeDB = async () => {
  await mongoose.connection.close();
  if (mongoServer) {
    await mongoServer.stop();
    console.log("🗄️  In-Memory MongoDB stopped.");
  }
};

module.exports = { connectDB, closeDB };
