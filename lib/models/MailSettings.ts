import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * Singleton SMTP connection used by the whole workspace.
 * Only one document is expected; helpers always upsert by a fixed key.
 */
export interface IMailSettings {
  _id: Types.ObjectId;
  key: string;
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  /** Stored server-side only — never returned to the browser in full. */
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  lastTestedAt?: Date | null;
  lastTestOk?: boolean | null;
  lastTestError?: string;
  updatedAt: Date;
  createdAt: Date;
}

export const MAIL_SETTINGS_KEY = 'default';

const mailSettingsSchema = new Schema<IMailSettings>(
  {
    key: { type: String, required: true, unique: true, default: MAIL_SETTINGS_KEY },
    enabled: { type: Boolean, default: false },
    host: { type: String, default: '', trim: true },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    username: { type: String, default: '', trim: true },
    password: { type: String, default: '' },
    fromName: { type: String, default: 'Lead Desk', trim: true, maxlength: 120 },
    fromEmail: { type: String, default: '', trim: true, lowercase: true },
    replyTo: { type: String, default: '', trim: true, lowercase: true },
    lastTestedAt: { type: Date, default: null },
    lastTestOk: { type: Boolean, default: null },
    lastTestError: { type: String, default: '' },
  },
  { timestamps: true },
);

export const MailSettings: Model<IMailSettings> =
  (mongoose.models.MailSettings as Model<IMailSettings>) ??
  mongoose.model<IMailSettings>('MailSettings', mailSettingsSchema);
