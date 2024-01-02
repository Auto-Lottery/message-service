import { debugLog, errorLog } from "../utilities/log";
import RabbitMQManager from "./rabbitmq-manager";
import VaultManager from "./vault-manager";
import { MobileOperator } from "../types/enums";
import { SmsService } from "./sms.service";

type UnitelConfig = {
  uname: string;
  pass: string;
  url: string;
  fromNumber: string;
};

export class UnitelApiService {
  private static config: UnitelConfig;
  private smsService;
  constructor() {
    this.smsService = new SmsService();
  }

  public static async getConfig(): Promise<UnitelConfig> {
    if (!UnitelApiService.config) {
      const vaultManager = VaultManager.getInstance();
      const config = await vaultManager.read("kv/data/smsUnitel");
      UnitelApiService.config = config as UnitelConfig;
    }
    return this.config;
  }

  async receiveSmsFromQueue() {
    const exchangeName = "sms";
    const queueName = MobileOperator.UNITEL;
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

          debugLog("uuuuuuuuuuuuuu", dataJsonString);
          if (!dataJsonString) {
            errorLog("Queue empty message");
            queueChannel.ack(msg);
            return;
          }
          try {
            const smsData = JSON.parse(dataJsonString);
            const smsConfig = await UnitelApiService.getConfig();
            const smsUrl = `${smsConfig.url}?uname=${smsConfig.uname}&upass=${smsConfig.pass}&from=${smsConfig.fromNumber}&mobile=${smsData.toNumber}&sms=${smsData.smsBody}`;
            await this.smsService.sendSms({
              operator: MobileOperator.UNITEL,
              smsUrl: smsUrl,
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
