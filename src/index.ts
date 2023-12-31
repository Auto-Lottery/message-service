import express from "express";
import V1Routes from "./api/v1/routes/routes";
import { connectDb } from "./api/v1/config/mongodb";
import { PORT } from "./api/v1/config";
import { connectQueue } from "./api/v1/config/rabbitmq";
import { infoLog } from "./api/v1/utilities/log";
import { UnitelApiService } from "./api/v1/services/unitel-api.service";
import { MobicomApiService } from "./api/v1/services/mobicom-api.service";
import { GmobileApiService } from "./api/v1/services/gmobile.service";
import { SkytelApiService } from "./api/v1/services/skytel.service";

const app = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

app.get("/", function (req, res: express.Response) {
  res.send("Message service auto deploy!");
});

app.use("/v1", V1Routes);

app.listen(PORT, async () => {
  infoLog(`Started server on ${PORT} port`);
  await connectDb();
  await connectQueue();

  const unitelApiService = new UnitelApiService();
  unitelApiService.receiveSmsFromQueue();
  const mobicomApiService = new MobicomApiService();
  mobicomApiService.receiveSmsFromQueue();
  const gmobileApiService = new GmobileApiService();
  gmobileApiService.receiveSmsFromQueue();
  const skytelApiService = new SkytelApiService();
  skytelApiService.receiveSmsFromQueue();
});
