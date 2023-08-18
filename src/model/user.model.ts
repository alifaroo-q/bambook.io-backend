import { Schema, model } from "mongoose";

interface IUser {
  fullName?: string;
  email: string;
  password?: string;
  googleId?: string;
  picture?: string;
}

const userSchema = new Schema<IUser>({
  fullName: String,
  email: {
    type: String,
    required: true,
  },
  password: String,
  googleId: String,
  picture: String,
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
