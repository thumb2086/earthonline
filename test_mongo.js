const mongoose = require('mongoose');

const uri = "mongodb+srv://huchialun9_db_user:ePNoxnt31zHbaO1M@cluster0.cgupuhz.mongodb.net/earthonline?appName=Cluster0";

console.log('Testing Mongoose Connection...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  .then(() => {
    console.log('SUCCESS: Connected to MongoDB Atlas!');
    process.exit(0);
  })
  .catch(err => {
    console.error('ERROR: Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  });
