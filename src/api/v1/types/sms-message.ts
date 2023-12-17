export type SmsMessage = {
  body?: string;
  fromAddress?: string;
  date?: number;
};

export type Message = {
  _id: string;
  body: string;
  fromAddress: string;
  status: string;
  description: string;
  date: string;
  createdDate: string;
};
