import MessageModel from "../models/message.model";
import SentSmsModel from "../models/sent-sms.model";
import { Message, SmsMessage } from "../types/sms-message";
import { User } from "../types/user";
import { getAmountAndDescriptionFromSmsBody } from "../utilities";
import { errorLog } from "../utilities/log";
import { AuthApiService } from "./auth-api.service";
import RabbitMQManager from "./rabbitmq-manager";

export class SmsService {
  constructor() {}

  async receiveDepositSms(message: SmsMessage) {
    const messageData: {
      body?: string;
      fromAddress?: string;
      date: Date | string | null;
      description: string;
      status: string;
    } = {
      body: message.body,
      fromAddress: message.fromAddress,
      date: message.date ? new Date(Number(message.date)) : null,
      description: "",
      status: ""
    };

    try {
      const res = getAmountAndDescriptionFromSmsBody(message.body);
      if (res.state === false) {
        messageData.description = res.errorText || "";
        messageData.status = "FAILED";
        await MessageModel.create(messageData);
        return false;
      }

      messageData.description = "Амжилтай хүлээж авлаа";
      messageData.status = "SUCCESS";
      const createdMessage: Message = (
        await MessageModel.create(messageData)
      ).toJSON();

      const rabbitMQManager = RabbitMQManager.getInstance();
      const rabbitMqChannel =
        await rabbitMQManager.createChannel("bank_transaction");

      if (rabbitMqChannel) {
        rabbitMqChannel.sendToQueue(
          "khanbank",
          Buffer.from(
            JSON.stringify({
              record: createdMessage._id.toString(),
              tranDate: createdMessage.date,
              amount: res.amount,
              description: res.description,
              relatedAccount: createdMessage.fromAddress
            })
          ),
          {
            persistent: true
          }
        );
      }
      return res;
    } catch (err) {
      errorLog("RECIEVE SMS ERROR::: ", err);
      messageData.description =
        err instanceof Error ? err.message : "INTERNAL SERVER ERROR";
      messageData.status = "FAILED";
      await MessageModel.create(messageData);
      return false;
    }
  }

  async sendMassSms({
    isExternal,
    toNumberList = [],
    token,
    smsBody,
    operator
  }: {
    isExternal?: boolean;
    toNumberList?: string[];
    token?: string;
    operator: string;
    smsBody: string;
  }) {
    try {
      const sentSmsData = {
        body: smsBody,
        massId: `${Date.now()}`,
        operator: operator,
        status: "SENDING"
      };

      if (isExternal) {
        const uniqueToNumbers = [...new Set(toNumberList)];
        const newSentSms = await SentSmsModel.create({
          ...sentSmsData,
          toNumbersCount: uniqueToNumbers.length
        });
        uniqueToNumbers.map((phoneNumber: string) => {
          this.smsRequestSentToQueue(
            operator,
            phoneNumber,
            smsBody,
            newSentSms._id.toString()
          );
        });
        return {
          code: 200,
          data: true
        };
      }

      const authApiService = new AuthApiService();
      const res = await authApiService.getAllUsers(token || "", operator);
      if (res.code === 500) {
        return res;
      }

      const sentSms = await SentSmsModel.create({
        ...sentSmsData,
        toNumbersCount: res.data.length
      });
      res.data.forEach((user: User) => {
        this.smsRequestSentToQueue(
          operator,
          user.phoneNumber,
          smsBody,
          sentSms._id.toString()
        );
      });
      return {
        code: 200,
        data: true
      };
    } catch (err) {
      errorLog("MASS SMS ERR::: ", err);
      return {
        code: 500,
        message: "Алдаа гарлаа"
      };
    }
  }

  async smsRequestSentToQueue(
    operator: string,
    toNumber: string,
    smsBody: string,
    sentSmsId: string
  ) {
    try {
      const rabbitMQManager = RabbitMQManager.getInstance();
      const rabbitMqChannel = await rabbitMQManager.createChannel("sms");
      if (rabbitMqChannel) {
        rabbitMqChannel.sendToQueue(
          operator,
          Buffer.from(
            JSON.stringify({
              operator,
              toNumber,
              smsBody,
              sentSmsId
            })
          ),
          {
            persistent: true
          }
        );
      }
    } catch (err) {
      errorLog(err);
    }
  }
}