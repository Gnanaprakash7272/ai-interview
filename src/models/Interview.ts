import mongoose, { Schema } from "mongoose";

const InterviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    domain: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    interviewType: {
      type: String,
      default: "technical",
    },
    language: {
      type: String,
      default: "en",
    },
    resumeText: {
      type: String,
      default: "",
    },
    jobDescriptionText: {
      type: String,
      default: "",
    },
    targetCompany: {
      type: String,
      default: "general",
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    questionCount: {
      type: Number,
      default: 3,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    confidenceScore: {
      type: Number,
      default: 0,
    },
    fluencyScore: {
      type: Number,
      default: 0,
    },
    recommendations: {
      type: [String],
      default: [],
    },
    careerGuidance: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Interview || mongoose.model("Interview", InterviewSchema);

