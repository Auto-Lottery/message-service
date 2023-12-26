import { isDev } from ".";
import RabbitMQManager from "../services/rabbitmq-manager";
import VaultManager from "../services/vault-manager";
import { errorLog } from "../utilities/log";

export const connectQueue = async () => {
  const rabbitMQManager = RabbitMQManager.getInstance();
  try {
    const vaultManager = VaultManager.getInstance();
    const configKey = isDev ? "kv/data/rabbitmqDev" : "kv/data/rabbitmq";
    const config = await vaultManager.read(configKey);
    await rabbitMQManager.init(config);
  } catch (error) {
    await rabbitMQManager.closeConnection();
    errorLog("RABBIT CONNECT ERR::: ", error);
    throw new Error("RabbitMQ-тэй холбогдоход алдаа гарлаа");
  }
};