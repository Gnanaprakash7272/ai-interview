import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    skills: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: "fresher",
    },
    resumeText: {
      type: String,
      default: "",
    },
    isProfileComplete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent compiling model twice during hot reloads
export default mongoose.models.User || mongoose.model("User", UserSchema);
