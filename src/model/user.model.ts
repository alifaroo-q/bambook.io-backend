import { Schema, model } from "mongoose";

interface IUser {
  fullName: string;
  email: string;
  password: string;
  googleId: string;
  picture: string;
}

const userSchema = new Schema<IUser>({
  fullName: {
    type: String,
  },
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
  },
  picture: {
    type: String,
  },
});

const UserModel = model<IUser>("User", userSchema);

export default UserModel;
