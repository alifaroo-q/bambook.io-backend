import { Schema, model } from "mongoose";

interface IUser {
  fullName?: string;
  email?: string;
  password?: string;
  googleId?: string;
  facebookId?: string;
}

const userSchema = new Schema<IUser>({
  fullName: String,
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
