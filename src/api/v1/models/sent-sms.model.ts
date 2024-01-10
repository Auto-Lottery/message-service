import { Schema, model } from "mongoose";
import { MobileOperator } from "../types/enums";

const SentSmsSchema = new Schema(
  {
    body: {
      type: String
    },
    operator: {
      type: String,
      required: true,
      enum: {
        values: [
          MobileOperator.MOBICOM,
          MobileOperator.UNITEL,
          MobileOperator.SKYTEL,
          MobileOperator.GMOBILE,
          MobileOperator.SYSTEM,
          MobileOperator.ONDO,
          MobileOperator.UNKNOWN
        ]
      }
    },
    status: {
      type: String
    },
    massId: {
      type: String
    },
    type: {
      type: String,
      required: true
    },
    toNumbersCount: {
      type: Number,
      required: true
    },
    successNumbers: {
      type: [String]
    },
    failedNumbers: {
      type: [String]
    },
    description: {
      type: String
    },
    additionalData: {
      type: String
    },
    createdDate: {
      type: Date,
      default: Date.now,
      index: -1
    }
  },
  {
    versionKey: false
  }
);

const SentSmsModel = model("sentSms", SentSmsSchema);

export default SentSmsModel;
