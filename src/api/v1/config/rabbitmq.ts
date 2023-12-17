import { RABBITMQ_CONFIG, isDev } from ".";
import RabbitMQManager from "../services/rabbitmq-manager";
import { infoLog } from "../utilities/log";

export const connectQueue = async () => {
  const rabbitMQManager = RabbitMQManager.getInstance();
  try {
    await rabbitMQManager.init(RABBITMQ_CONFIG);
  } catch (error) {
    await rabbitMQManager.closeConnection();
    infoLog("RABBIT CONNECT ERR::: ", error);
    throw new Error("RabbitMQ-тэй холбогдоход алдаа гарлаа");
  }
};
