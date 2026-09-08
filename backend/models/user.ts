import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: (email: string) => {
        const atIndex = email.indexOf('@');
        const dotIndex = email.lastIndexOf('.');
        return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
      },
      message: 'Please enter a valid email address',
    },
  },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: true,
});

export default mongoose.model<IUser>('User', userSchema);