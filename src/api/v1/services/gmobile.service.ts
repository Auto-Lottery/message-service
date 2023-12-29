import axios from "axios";
import { errorLog } from "../utilities/log";
import RabbitMQManager from "./rabbitmq-manager";
import VaultManager from "./vault-manager";
import { MobileOperator } from "../types/enums";
import SentSmsModel from "../models/sent-sms.model";

type GmobileConfig = {
  username: string;
  password: string;
  url: string;
  from: string;
};

export class GmobileApiService {
  private static config: GmobileConfig;
  constructor() {}

  public static async getConfig(): Promise<GmobileConfig> {
    if (!GmobileApiService.config) {
      const vaultManager = VaultManager.getInstance();
      const config = await vaultManager.read("kv/data/smsGmobile");
      GmobileApiService.config = config as GmobileConfig;
    }
    return this.config;
  }

  async receiveSmsFromQueue() {
    const exchangeName = "sms";
    const queueName = MobileOperator.GMOBILE;
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
            const res = await this.sendSms(
              smsData.toNumber,
              smsData.smsBody,
              smsData.sentSmsId
            );
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

  async sendSms(toNumber: string, smsBody: string, sentSmsId?: string) {
    let _sentSmsId = sentSmsId;
    let foundSentSms = null;
    const smsConfig = await GmobileApiService.getConfig();
    if (!_sentSmsId) {
      const sentSmsData = {
        body: smsBody,
        operator: MobileOperator.GMOBILE,
        status: "SENDING"
      };
      foundSentSms = await SentSmsModel.create({
        ...sentSmsData,
        toNumbersCount: 1
      });
      _sentSmsId = foundSentSms._id.toString();
    }
    try {
      const res = await axios.get(
        `${smsConfig.url}?username=${smsConfig.username}&password=${smsConfig.password}&from=${smsConfig.from}&mobile=${toNumber}&sms=${smsBody}`
      );

      if (!foundSentSms) {
        foundSentSms = await SentSmsModel.findById(_sentSmsId);
      }
      const sentSmsCount =
        (foundSentSms?.failedNumbers?.length || 0) +
        (foundSentSms?.successNumbers?.length || 0);
      const updateQuery = {
        $set: {}
      };
      if (sentSmsCount + 1 >= (foundSentSms?.toNumbersCount || 0)) {
        updateQuery.$set = {
          status: "COMPLETED"
        };
      }

      if (res.data === "SUCCESS") {
        await SentSmsModel.updateOne(
          {
            _id: _sentSmsId
          },
          {
            $push: {
              successNumbers: toNumber
            },
            ...updateQuery
          }
        );
      } else {
        await SentSmsModel.updateOne(
          {
            _id: _sentSmsId
          },
          {
            $push: {
              failedNumbers: toNumber
            },
            ...updateQuery
          }
        );
      }
      return {
        code: 200,
        data: res.data
      };
    } catch (err) {
      errorLog("SEND GMOBILE SMS ERR::: ", err);
      return {
        code: 500,
        message: "Мессеж илгээхэд алдаа гарлаа"
      };
    }
  }
}
