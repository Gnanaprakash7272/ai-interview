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
    // Existing 0-100 scores (preserved for backward compatibility)
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
    // New granular 0-10 sub-scores
    grammarScore: {
      type: Number,
      default: 0,
    },
    clarityScore: {
      type: Number,
      default: 0,
    },
    problemSolvingScore: {
      type: Number,
      default: 0,
    },
    // Hiring verdict and round info
    hiringRecommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Weak Hire", "Reject"],
      default: "Weak Hire",
    },
    round: {
      type: String,
      default: "Technical Round",
    },
    // Voice metrics
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
    // Qualitative feedback
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    missingConcepts: {
      type: [String],
      default: [],
    },
    // Answer comparison
    expectedAnswer: {
      type: String,
      default: "",
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
