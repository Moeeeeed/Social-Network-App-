import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
}

const postSchema = new Schema<IPost>(
  {
    content: {
      type: String,
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Post = mongoose.model<IPost>('Post', postSchema);

export { Post };
export default Post;