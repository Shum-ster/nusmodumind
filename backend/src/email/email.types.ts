export type SendEmailInput = {
  html: string;
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
};
