import mongoose from "mongoose";
import VaultManager from "../services/vault-manager";
import { errorLog, infoLog } from "../utilities/log";
import { isDev } from ".";

export const connectDb = async () => {
  try {
    const vaultManager = VaultManager.getInstance();
    const configKey = isDev ? "kv/data/mongodbDev" : "kv/data/mongodb";
    const config = await vaultManager.read(configKey);
    await mongoose.connect(config.MONGO_URL, {
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
