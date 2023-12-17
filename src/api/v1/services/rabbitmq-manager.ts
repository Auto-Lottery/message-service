import * as amqp from "amqplib";
import { infoLog } from "../utilities/log";

class RabbitMQManager {
  private static instance: RabbitMQManager;
  private connection: amqp.Connection | null = null;
  private channels: Map<string, amqp.Channel> = new Map();

  //bank_transaction
  private constructor() {}

  public static getInstance(): RabbitMQManager {
    if (!RabbitMQManager.instance) {
      RabbitMQManager.instance = new RabbitMQManager();
    }
    return RabbitMQManager.instance;
  }

  public async init(config: Record<string, string>) {
    try {
      // Connect to RabbitMQ server
      this.connection = await amqp.connect({
        hostname: config.RABBIT_MQ_HOST,
        port: Number(config.RABBIT_MQ_PORT),
        username: config.RABBIT_MQ_USER,
        password: config.RABBIT_MQ_PASSWORD
      });
      infoLog("RabbitMQ connected.");
    } catch (error) {
      console.error("RABBIT INIT ERR::: ", error);
      throw new Error("INTERNAL SERVER ERROR");
    }
  }

  public async createChannel(channelName: string): Promise<amqp.Channel> {
    if (!this.connection) {
      throw new Error("RabbitMQ connection not initialized");
    }

    if (this.channels.has(channelName)) {
      const channel = this.channels.get(channelName);
      if (channel) {
        return channel;
      }
      throw new Error("RabbitMQ connection not initialized");
    }

    const channel = await this.connection.createChannel();
    this.channels.set(channelName, channel);

    return channel;
  }

  public getChannel(channelName: string): amqp.Channel {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(
        `Channel ${channelName} not found. Call createChannel() first.`
      );
    }
    return channel;
  }

  public async closeConnection() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.channels.clear();
    }
  }
}

export default RabbitMQManager;
