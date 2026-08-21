import mongoose, { Schema, type Model, type Types } from 'mongoose';

export interface ISite {
  _id: Types.ObjectId;
  name: string;
  domain: string;
  apiKey: string;
  /**
   * Origins permitted to POST leads from the browser. Empty means any origin is
   * allowed, which is the sane default because the API key is the real gate and
   * public marketing forms are often served from several hostnames.
   */
  allowedOrigins: string[];
  /** Agent who receives leads from this site when no explicit owner is set. */
  defaultAssignee?: Types.ObjectId | null;
  isActive: boolean;
  leadCount: number;
  lastLeadAt?: Date | null;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const siteSchema = new Schema<ISite>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    domain: { type: String, required: true, trim: true, lowercase: true },
    apiKey: { type: String, required: true, unique: true },
    allowedOrigins: { type: [String], default: [] },
    defaultAssignee: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
    leadCount: { type: Number, default: 0 },
    lastLeadAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true },
);

export const Site: Model<ISite> =
  (mongoose.models.Site as Model<ISite>) ??
  mongoose.model<ISite>('Site', siteSchema);
