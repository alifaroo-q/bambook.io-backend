import mongoose, { model, Schema } from "mongoose";

const groupSchema = new Schema({
  group_name: String,
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  pages: [
    {
      type: mongoose.Types.ObjectId,
      ref: "Page",
    },
  ],
});

const GroupModel = model("Group", groupSchema);
export default GroupModel;
