import express from "express";
import { infoLog } from "../utilities/log";
const testRoutes = express.Router();

testRoutes.get("/", (req, res) => {
  infoLog(`Mobile app connected! ${Date.now()}`);
  res.send({
    code: 200,
    data: "test"
  });
});

export default testRoutes;
