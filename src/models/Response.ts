import mongoose, { Schema } from "mongoose";

const ResponseSchema = new Schema(
  {
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: "Interview",
      required: true,
    },
    question: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      default: "",
    },
    score: {
      type: Number,
      default: 0,
    },
    technicalAccuracy: {
      type: Number,
      default: 0,
    },
    communication: {
      type: Number,
      default: 0,
    },
    confidence: {
      type: Number,
      default: 0,
    },
    fluency: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number,
      default: 0,
    },
    speakingSpeed: {
      type: Number,
      default: 0,
    },
    hesitationCount: {
      type: Number,
      default: 0,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    missingConcepts: {
      type: [String],
      default: [],
    },
    improvedAnswer: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Response || mongoose.model("Response", ResponseSchema);

