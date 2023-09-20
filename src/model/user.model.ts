import { Schema, model } from "mongoose";

interface IUser {
  fullName?: string;
  email?: string;
  password?: string;
  image?: string;
  isPublic?: boolean;
  isAdmin?: boolean;
  phone?: string;
  googleId?: string;
  facebookId?: string;
}

const userSchema = new Schema<IUser>({
  fullName: String,
  email: String,
  password: String,
  image: String,
  isPublic: {
    type: Boolean,
    default: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  phone: String,
  googleId: String,
  facebookId: String,
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
