import mongoose from "mongoose";
import { errorLog, infoLog } from "../utilities/log";
import { MONGO_URL } from ".";

export const connectDb = async () => {
  try {
    await mongoose.connect(MONGO_URL, {
      serverApi: {
        version: "1",
        strict: true,
        deprecationErrors: true
      }
    });
  } catch (err) {
    errorLog(err);
    throw new Error("Өгөгдлийн сантай холбогдоход алдаа гарлаа");
  }
};

mongoose.connection.on("connected", async () => {
  infoLog("MongoDB connected.");
});