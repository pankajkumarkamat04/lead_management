import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { MAIL_LOG_STATUSES, type MailLogStatus } from '../constants';

export interface IMailLog {
  _id: Types.ObjectId;
  lead?: Types.ObjectId | null;
  /** Hardcoded template id, e.g. `first-reply`. */
  templateKey: string;
  templateName: string;
  to: string;
  subject: string;
  body: string;
  status: MailLogStatus;
  error?: string;
  sentBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const mailLogSchema = new Schema<IMailLog>(
  {
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
    templateKey: { type: String, default: '' },
    templateName: { type: String, default: '' },
    to: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, required: true, maxlength: 300 },
    body: { type: String, required: true, maxlength: 20_000 },
    status: { type: String, enum: MAIL_LOG_STATUSES, required: true },
    error: { type: String, default: '', maxlength: 2000 },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

mailLogSchema.index({ createdAt: -1 });
mailLogSchema.index({ lead: 1, createdAt: -1 });
mailLogSchema.index({ status: 1, createdAt: -1 });

export const MailLog: Model<IMailLog> =
  (mongoose.models.MailLog as Model<IMailLog>) ??
  mongoose.model<IMailLog>('MailLog', mailLogSchema);
