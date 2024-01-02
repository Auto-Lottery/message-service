import axios, { AxiosError } from "axios";
import MessageModel from "../models/message.model";
import SentSmsModel from "../models/sent-sms.model";
import { MobileOperator } from "../types/enums";
import { Message, SmsMessage } from "../types/sms-message";
import { getAmountAndDescriptionFromSmsBody } from "../utilities";
import { errorLog, infoLog } from "../utilities/log";
import { AuthApiService } from "./auth-api.service";
import RabbitMQManager from "./rabbitmq-manager";
import { CustomResponse } from "../types/custom-response";
export class SmsService {
  private authApiService;
  constructor() {
    this.authApiService = new AuthApiService();
  }

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

  async sendSmsToPaginationUsers(
    page: number = 1,
    pageSize: number = 100,
    operator: string,
    sentSmsData: {
      body: string;
      massId: string;
      operator: string;
      status: string;
    },
    smsBody: string,
    token?: string,
    sentSms?: string
  ): Promise<CustomResponse<boolean>> {
    let _sentSmsId = sentSms;
    const res = await this.authApiService.getAllUsersPhoneNumber(
      page,
      pageSize,
      token || "",
      operator
    );
    infoLog("Call users page:: ", page);
    if (res.code === 500) {
      return res;
    }

    if (page === 1) {
      const sentSms = await SentSmsModel.create({
        ...sentSmsData,
        toNumbersCount: res.data.total
      });
      _sentSmsId = sentSms._id.toString();
    }

    res.data.phoneNumberList.forEach((phoneNumber) => {
      this.smsRequestSentToQueue(operator, phoneNumber, smsBody, _sentSmsId);
    });

    if (page * pageSize < res.data.total) {
      const result = await this.sendSmsToPaginationUsers(
        page + 1,
        pageSize,
        operator,
        sentSmsData,
        smsBody,
        token,
        _sentSmsId
      );
      return result;
    }

    return {
      code: 200,
      data: true
    };
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
            phoneNumber.trim(),
            smsBody,
            newSentSms._id.toString()
          );
        });
        return {
          code: 200,
          data: true
        };
      }

      this.sendSmsToPaginationUsers(
        1,
        300,
        operator,
        sentSmsData,
        smsBody,
        token
      );

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
    sentSmsId?: string
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

  async sendSms({
    operator,
    smsUrl,
    toNumber,
    smsBody,
    sentSmsId,
    additionalData
  }: {
    operator: MobileOperator;
    smsUrl: string;
    toNumber: string;
    smsBody: string;
    sentSmsId?: string;
    additionalData?: string;
  }) {
    let _sentSmsId = sentSmsId;
    let foundSentSms = null;

    infoLog("mass _sentSmsId ", _sentSmsId);
    if (!_sentSmsId) {
      const sentSmsData = {
        body: smsBody,
        operator: operator,
        status: "SENDING"
      };
      foundSentSms = await SentSmsModel.create({
        ...sentSmsData,
        toNumbersCount: 1
      });
      _sentSmsId = foundSentSms._id.toString();
      infoLog("single _sentSmsId ", _sentSmsId);
    }

    try {
      if (
        [
          MobileOperator.MOBICOM,
          MobileOperator.UNITEL,
          MobileOperator.GMOBILE,
          MobileOperator.SKYTEL
        ].includes(operator)
      ) {
        const res = await axios.get(smsUrl);

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

        if (
          ["SUCCESS", "Sent", "OK", "0: Accepted for delivery"].includes(
            res.data
          )
        ) {
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
      } else {
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
            status: "COMPLETED",
            additionalData: additionalData
          };
        }
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
        return {
          code: 200,
          data: true
        };
      }
    } catch (err) {
      errorLog(`SEND SMS ERR::: ---${err}`, err);
      let errorMessage = "Мессеж илгээхэд алдаа гарлаа";
      if (err instanceof AxiosError) {
        errorMessage = `${err.message} - ${err.stack}`;
      }
      await SentSmsModel.updateOne(
        {
          _id: _sentSmsId
        },
        {
          $push: {
            failedNumbers: toNumber
          },
          $set: {
            status: "FAILED",
            additionalData: additionalData,
            description: errorMessage
          }
        }
      );
      return {
        code: 500,
        message: errorMessage
      };
    }
  }
}
