import mongoose, { Schema } from "mongoose";

const InterviewSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Job configuration
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
    // Candidate profile fields (new)
    candidateName: {
      type: String,
      default: "Candidate",
    },
    skills: {
      type: [String],
      default: [],
    },
    experienceLevel: {
      type: String,
      default: "fresher",
    },
    // Optional tailoring
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
    // Session state
    workflowPlan: {
      type: Schema.Types.Mixed, // Stores the InterviewWorkflowPlan JSON
      default: null,
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
    // Aggregate scores
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
    // Overall hiring verdict for the session
    overallHiringRecommendation: {
      type: String,
      enum: ["Strong Hire", "Hire", "Weak Hire", "Reject"],
      default: "Weak Hire",
    },
    recommendations: {
      type: [String],
      default: [],
    },
    careerGuidance: {
      type: Schema.Types.Mixed,
      default: {},
    },
    // Agent pipeline fields (5-agent MNC simulator)
    curatedQuestions: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    questionSources: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Interview || mongoose.model("Interview", InterviewSchema);
