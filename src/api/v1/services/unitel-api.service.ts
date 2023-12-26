import axios from "axios";
import { errorLog } from "../utilities/log";
import RabbitMQManager from "./rabbitmq-manager";
import VaultManager from "./vault-manager";
import { MobileOperator } from "../types/enums";
import SentSmsModel from "../models/sent-sms.model";

type UnitelConfig = {
  uname: string;
  pass: string;
  url: string;
  fromNumber: string;
};

export class UnitelApiService {
  private static config: UnitelConfig;
  constructor() {}

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

          console.log("uuuuuuuuuuuuuu", dataJsonString);
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
    const smsConfig = await UnitelApiService.getConfig();
    if (!_sentSmsId) {
      const sentSmsData = {
        body: smsBody,
        operator: MobileOperator.UNITEL,
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
        `${smsConfig.url}?uname=${smsConfig.uname}&upass=${smsConfig.pass}&from=${smsConfig.fromNumber}&mobile=${toNumber}&sms=${smsBody}`
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
      errorLog("SEND UNITEL SMS ERR::: ", err);
      return {
        code: 500,
        message: "Мессеж илгээхэд алдаа гарлаа"
      };
    }
  }
}
