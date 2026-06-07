const mongoose = require('mongoose');

const uri = "mongodb+srv://huchialun9_db_user:ePNoxnt31zHbaO1M@cluster0.cgupuhz.mongodb.net/earthonline?appName=Cluster0";

mongoose.connect(uri)
  .then(() => {
    console.log("SUCCESS: Connected to MongoDB Atlas!");
    process.exit(0);
  })
  .catch(err => {
    console.error("FAILED to connect:", err.message);
    process.exit(1);
  });
