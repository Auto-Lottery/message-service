import express from "express";
import { SmsService } from "../services/sms.service";
import { AuthApiService } from "../services/auth-api.service";
import { MobileOperator } from "../types/enums";
import { UnitelApiService } from "../services/unitel-api.service";
import { MobicomApiService } from "../services/mobicom-api.service";
const smsRoutes = express.Router();

smsRoutes.post("/receiveSms", async (req, res) => {
  try {
    const smsService = new SmsService();
    const response = await smsService.receiveDepositSms(req.body);
    res.send(response);
  } catch (err) {
    res.status(500).json(err);
  }
});

smsRoutes.post(
  "/sendMassSms",
  AuthApiService.adminVerifyToken,
  async (req, res) => {
    try {
      const { isExternal, toNumberList, operator, smsBody } = req.body;
      const { authorization } = req.headers;
      const smsService = new SmsService();
      if ([MobileOperator.UNITEL, MobileOperator.MOBICOM].includes(operator)) {
        const response = await smsService.sendMassSms({
          isExternal,
          toNumberList,
          operator,
          smsBody: smsBody,
          token: authorization?.substring(7)
        });
        return res.send(response);
      }
      return res.send({
        code: 500,
        message: `Unsupported operator {${operator}}`
      });
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

smsRoutes.post(
  "/sendSms",
  AuthApiService.adminVerifyToken,
  async (req, res) => {
    const { toNumber, operator, smsBody } = req.body;
    try {
      if (operator === MobileOperator.UNITEL) {
        const unitelApiService = new UnitelApiService();
        const result = await unitelApiService.sendSms(toNumber, smsBody);
        return res.send(result);
      } else if (operator === MobileOperator.MOBICOM) {
        const mobicomApiService = new MobicomApiService();
        const result = await mobicomApiService.sendSms(toNumber, smsBody);
        return res.send(result);
      } else {
        return res.send({
          code: 500,
          message: `Unsupported operator {${operator}}`
        });
      }
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

export default smsRoutes;
