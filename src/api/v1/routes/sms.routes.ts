import express from "express";
import { SmsService } from "../services/sms.service";
import { AuthApiService } from "../services/auth-api.service";
import { MobileOperator } from "../types/enums";
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
      if (
        [
          MobileOperator.UNITEL,
          MobileOperator.MOBICOM,
          MobileOperator.GMOBILE,
          MobileOperator.SKYTEL
        ].includes(operator)
      ) {
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

smsRoutes.post("/sendSms", AuthApiService.adminVerifyToken, (req, res) => {
  const { toNumber, operator, smsBody } = req.body;
  try {
    const smsService = new SmsService();
    smsService.smsRequestSentToQueue(operator, toNumber, smsBody);
    return res.send({
      code: 200,
      data: true
    });
  } catch (err) {
    return res.status(500).json(err);
  }
});

smsRoutes.post("/test", (req, res) => {
  console.log("Test::: ", req.body);
  res.send({
    data: "OK"
  });
});

export default smsRoutes;
