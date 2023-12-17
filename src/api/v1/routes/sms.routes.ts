import express from "express";
import { SmsService } from "../services/sms.service";
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

export default smsRoutes;
