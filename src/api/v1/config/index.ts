import { config } from "dotenv";
config();

const VAULT_URL = process.env.VAULT_URL || "";
const VAULT_TOKEN = process.env.VAULT_TOKEN || "";
const PORT = Number(process.env.PORT || "5003");
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "";
const MONGO_URL = process.env.MONGO_URL || "";
const isDev = process.env.NODE_ENV !== "production";
const RABBITMQ_CONFIG = {
    RABBIT_MQ_HOST:  process.env.RABBIT_MQ_HOST || "",
    RABBIT_MQ_PORT: process.env.RABBIT_MQ_PORT || "",
    RABBIT_MQ_USER: process.env.RABBIT_MQ_USER || "",
    RABBIT_MQ_PASSWORD: process.env.RABBIT_MQ_PASSWORD || "",
}

export { VAULT_URL, VAULT_TOKEN, PORT, AUTH_SERVICE_URL, isDev, MONGO_URL, RABBITMQ_CONFIG };
