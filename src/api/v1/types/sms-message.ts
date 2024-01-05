export type SmsMessage = {
  body?: string;
  fromAddress?: string;
  date?: number;
  id?: string;
};

export type Message = {
  _id: string;
  smsId?: string;
  body: string;
  fromAddress: string;
  status: string;
  description: string;
  date: string;
  createdDate: string;
};
