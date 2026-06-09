const mongoose = require("mongoose");

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
        console.error("MONGO_URI is not defined. Create a .env file with MONGO_URI or set the environment variable.");
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoURI);
        console.log("MongoDB Connected");
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;