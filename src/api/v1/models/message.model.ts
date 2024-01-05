import { Schema, model } from "mongoose";

const MessageSchema = new Schema(
  {
    body: {
      type: String
    },
    smsId: {
      type: String
    },
    fromAddress: {
      type: String,
      required: true
    },
    status: {
      type: String
    },
    description: {
      type: String
    },
    date: {
      type: Date,
      required: true
    },
    createdDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

const MessageModel = model("message", MessageSchema);

export default MessageModel;
