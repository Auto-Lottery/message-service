import { errorLog } from "../utilities/log";
import RabbitMQManager from "./rabbitmq-manager";
import VaultManager from "./vault-manager";
import { MobileOperator } from "../types/enums";
import { SmsService } from "./sms.service";

type SkytelConfig = {
  username: string;
  password: string;
  url: string;
  from: string;
};

export class SkytelApiService {
  private static config: SkytelConfig;
  private smsService;
  constructor() {
    this.smsService = new SmsService();
  }

  public static async getConfig(): Promise<SkytelConfig> {
    if (!SkytelApiService.config) {
      const vaultManager = VaultManager.getInstance();
      const config = await vaultManager.read("kv/data/smsSkytel");
      SkytelApiService.config = config as SkytelConfig;
    }
    return this.config;
  }

  async receiveSmsFromQueue() {
    const exchangeName = "sms";
    const queueName = MobileOperator.SKYTEL;
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
            // const smsConfig = await SkytelApiService.getConfig();
            // const smsUrl = `${smsConfig.url}?username=${smsConfig.username}&password=${smsConfig.password}&from=${smsConfig.from}&mobile=${smsData.toNumber}&sms=${smsData.smsBody}`;
            const res = await this.smsService.sendSms({
              operator: MobileOperator.SKYTEL,
              smsUrl: "",
              ...smsData
            });
            if (res.code === 200) {
              queueChannel.ack(msg);
              return;
            }
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
