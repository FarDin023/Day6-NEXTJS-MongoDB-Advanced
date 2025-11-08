import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, unique: true })
  emailLower: string;

  @Prop()
  age: number;

  @Prop()
  phone?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt: Date;

  @Prop()
  deletedBy?: string;

  @Prop()
  deleteReason?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create text index
UserSchema.index(
  { name: 'text', email: 'text' },
  { weights: { name: 3, email: 1 }, background: true }
);

// Create compound index for age and createdAt
UserSchema.index(
  { age: 1, createdAt: -1 },
  { background: true }
);

// Add pre-save middleware to set emailLower
UserSchema.pre('save', function(next) {
  if (this.email) {
    this.emailLower = this.email.toLowerCase();
  }
  next();
});

// Add pre-insertMany middleware
UserSchema.pre('insertMany', function(next, docs) {
  if (Array.isArray(docs)) {
    docs.forEach(doc => {
      if (doc.email) {
        doc.emailLower = doc.email.toLowerCase();
      }
    });
  }
  next();
});
