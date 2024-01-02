import { errorLog } from "../utilities/log";
import RabbitMQManager from "./rabbitmq-manager";
import VaultManager from "./vault-manager";
import { MobileOperator } from "../types/enums";
import { SmsService } from "./sms.service";

type MobicomConfig = {
  username: string;
  servicename: string;
  url: string;
  from: string;
};

export class MobicomApiService {
  private static config: MobicomConfig;
  private smsService;
  constructor() {
    this.smsService = new SmsService();
  }

  public static async getConfig(): Promise<MobicomConfig> {
    if (!MobicomApiService.config) {
      const vaultManager = VaultManager.getInstance();
      const config = await vaultManager.read("kv/data/smsMobicom");
      MobicomApiService.config = config as MobicomConfig;
    }
    return this.config;
  }

  async receiveSmsFromQueue() {
    const exchangeName = "sms";
    const queueName = MobileOperator.MOBICOM;
    const routingKey = "send";
    const rabbitMqManager = RabbitMQManager.getInstance();
    const queueChannel = await rabbitMqManager.createChannel(exchangeName);

    queueChannel.assertExchange(exchangeName, "direct", {
      durable: true
    });

    queueChannel.assertQueue(queueName, {
      durable: true
    });

    queueChannel.bindQueue(queueName, exchangeName, routingKey);

    queueChannel.prefetch(1);

    queueChannel.consume(
      queueName,
      async (msg) => {
        if (msg?.content) {
          const dataJsonString = msg.content.toString();
          if (!dataJsonString) {
            errorLog("Queue empty message");
            queueChannel.ack(msg);
            return;
          }
          try {
            const smsData = JSON.parse(dataJsonString);
            const smsConfig = await MobicomApiService.getConfig();
            const smsUrl = `${smsConfig.url}?servicename=${smsConfig.servicename}&username=${smsConfig.username}&from=${smsConfig.from}&to=${smsData.toNumber}&msg=${smsData.smsBody}`;
            await this.smsService.sendSms({
              operator: MobileOperator.MOBICOM,
              smsUrl,
              ...smsData
            });
            queueChannel.ack(msg);
          } catch (err) {
            errorLog("Transaction update queue error::: ", err);
          }
        }
      },
      {
        noAck: false
      }
    );
  }
}
