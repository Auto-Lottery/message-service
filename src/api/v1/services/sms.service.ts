import MessageModel from "../models/message.model";
import { Message, SmsMessage } from "../types/sms-message";
import { getAmountAndDescriptionFromSmsBody } from "../utilities";
import { errorLog } from "../utilities/log";
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
}
