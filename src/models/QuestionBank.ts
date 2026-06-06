import mongoose, { Schema } from "mongoose";

/**
 * QuestionBank — RAG Vector Store
 * Stores real MNC interview questions with Gemini text-embedding-004 embeddings
 * for semantic retrieval during the Search Agent phase.
 */
const QuestionBankSchema = new Schema(
  {
    // Identity
    company: { type: String, required: true, index: true },
    role: { type: String, required: true, index: true },
    topic: { type: String, required: true },
    round: {
      type: String,
      enum: ["Technical Round", "HR Round", "Managerial Round", "System Design Round"],
      required: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    // Question content
    question: { type: String, required: true, unique: true },
    source: { type: String, default: "User Session" },
    year: { type: String, default: "2025" },
    isReal: { type: Boolean, default: true },
    companyVerified: { type: Boolean, default: false },

    // RAG vector (text-embedding-004 = 768 dimensions)
    embedding: {
      type: [Number],
      default: [],
      select: false,   // exclude from default queries (fetch only when needed)
    },

    // Expected answer metadata — ALWAYS the correct/model answer, NEVER the candidate's answer
    expectedKeywords: { type: [String], default: [] },
    modelAnswer: { type: String, default: "" },

    // Source tracking
    storedBy: {
      type: String,
      enum: ["seed", "evaluator", "admin"],
      default: "seed",
    },

    // Quality tracking (updated after each session that uses this question)
    usageCount: { type: Number, default: 0 },
    avgCandidateScore: { type: Number, default: 0 },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index for fast candidate pre-filtering before cosine similarity
QuestionBankSchema.index({ company: 1, role: 1, difficulty: 1 });
QuestionBankSchema.index({ company: 1, round: 1 });

export default mongoose.models.QuestionBank ||
  mongoose.model("QuestionBank", QuestionBankSchema);
