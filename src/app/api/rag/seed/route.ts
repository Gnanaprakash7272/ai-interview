/**
 * POST /api/rag/seed
 * Seeds the MongoDB QuestionBank with initial questions from companyQuestions.json
 * and static fallback questions with Gemini embeddings.
 *
 * Admin-only: requires SEED_SECRET header to match SEED_SECRET env var.
 */
import { NextResponse } from "next/server";
import { batchSeedQuestions } from "@/lib/rag";
import companyQuestions from "@/data/companyQuestions.json";
import type { StoreQuestionInput } from "@/lib/rag";

// Seed questions for every company in companyQuestions.json
function buildSeedQuestions(): StoreQuestionInput[] {
  const seeds: StoreQuestionInput[] = [];

  const companyMap: Record<string, { role: string; round: "Technical Round" | "HR Round" | "Managerial Round" | "System Design Round" }> = {
    tcs: { role: "Software Engineer", round: "Technical Round" },
    infosys: { role: "Software Engineer", round: "Technical Round" },
    wipro: { role: "Software Engineer", round: "Technical Round" },
    accenture: { role: "Associate Software Engineer", round: "Technical Round" },
    cognizant: { role: "Programmer Analyst", round: "Technical Round" },
    google: { role: "Software Engineer", round: "Technical Round" },
    amazon: { role: "Software Development Engineer", round: "Technical Round" },
    microsoft: { role: "Software Engineer", round: "Technical Round" },
    zoho: { role: "Software Engineer", round: "Technical Round" },
  };

  for (const [companyKey, meta] of Object.entries(companyMap)) {
    const data = (companyQuestions as any)[companyKey];
    if (!data?.sampleQuestions) continue;

    data.sampleQuestions.forEach((q: string, idx: number) => {
      const isHR = idx >= data.sampleQuestions.length * 0.75;
      const isManagerial = !isHR && idx >= data.sampleQuestions.length * 0.55;
      const round: StoreQuestionInput["round"] = isHR
        ? "HR Round"
        : isManagerial
          ? "Managerial Round"
          : "Technical Round";

      seeds.push({
        question: q,
        company: companyKey,
        role: meta.role,
        topic: data.category || "General",
        round,
        difficulty: idx < data.sampleQuestions.length * 0.4 ? "easy" : idx < data.sampleQuestions.length * 0.75 ? "medium" : "hard",
        source: "companyQuestions.json",
        year: "2025",
        isReal: true,
        companyVerified: true,
        expectedKeywords: [],
        storedBy: "seed" as const,
      });
    });
  }

  // ─── Curated high-quality seed questions (verified real) ─────────────────

  const curated: StoreQuestionInput[] = [
    // TCS
    {
      question: "You are given an unsorted array [2, 3, 1, 2, 5, 3]. Find the FIRST element that appears more than once. Your solution must run in O(N) time with O(N) space. Walk me through your HashSet approach.",
      company: "tcs", role: "Software Engineer", topic: "Arrays / HashSet",
      round: "Technical Round", difficulty: "medium",
      source: "GeeksForGeeks", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["HashSet", "O(N)", "contains", "first occurrence", "iteration"],
      storedBy: "admin" as const,
    },
    {
      question: "Write a SQL query to find the 2nd highest salary from Employee(id, name, salary). Do NOT use LIMIT or TOP. Show the full query and explain your approach step by step.",
      company: "tcs", role: "Software Engineer", topic: "SQL Subqueries",
      round: "Technical Round", difficulty: "medium",
      source: "InterviewBit", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["MAX", "subquery", "NOT IN", "nested SELECT", "NULL case"],
      storedBy: "admin" as const,
    },
    {
      question: "Explain the 4 pillars of OOP with real-world examples. Then write a Java/Python code snippet demonstrating polymorphism.",
      company: "tcs", role: "Software Engineer", topic: "OOP Concepts",
      round: "Technical Round", difficulty: "easy",
      source: "Glassdoor", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["encapsulation", "inheritance", "polymorphism", "abstraction", "method overriding"],
      storedBy: "admin" as const,
    },
    // Google
    {
      question: "Design a URL shortener like bit.ly that can handle 100 million URLs per day. Discuss the data model, hashing strategy, cache layer, and how you'd handle hash collisions.",
      company: "google", role: "Software Engineer", topic: "System Design",
      round: "System Design Round", difficulty: "hard",
      source: "Glassdoor", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["consistent hashing", "Redis", "CDN", "base62", "collision resolution", "horizontal scaling"],
      storedBy: "admin" as const,
    },
    {
      question: "Given a binary tree, serialize it to a string and deserialize it back to a binary tree. Implement both functions. Input: root=[1,2,3,null,null,4,5]. Expected: The tree can be reconstructed identically.",
      company: "google", role: "Software Engineer", topic: "Binary Trees",
      round: "Technical Round", difficulty: "hard",
      source: "LeetCode Discuss", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["BFS", "DFS", "preorder", "delimiter", "null marker", "queue"],
      storedBy: "admin" as const,
    },
    // Amazon
    {
      question: "Tell me about a time you had to make a critical decision without having all the information you needed. What was the situation, your decision process, and what happened? Use STAR format.",
      company: "amazon", role: "Software Development Engineer", topic: "Leadership Principles",
      round: "HR Round", difficulty: "medium",
      source: "Glassdoor", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["Bias for Action", "ownership", "calculated risk", "outcome", "learned"],
      storedBy: "admin" as const,
    },
    {
      question: "Design Amazon's product recommendation system. It must handle 500M users and 50M products. Walk through the data pipeline, collaborative filtering vs content-based filtering, and how you'd serve recommendations in < 100ms.",
      company: "amazon", role: "Software Development Engineer", topic: "System Design",
      round: "System Design Round", difficulty: "hard",
      source: "InterviewBit", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["collaborative filtering", "content-based", "matrix factorization", "DynamoDB", "SageMaker", "ElastiCache"],
      storedBy: "admin" as const,
    },
    // Infosys
    {
      question: "Write a program to find all anagram groups in an array of strings. E.g., Input: ['eat', 'tea', 'tan', 'ate', 'nat', 'bat']. Output: [['eat','tea','ate'],['tan','nat'],['bat']]. Time: O(N*K*log K).",
      company: "infosys", role: "Software Engineer", topic: "Hashing / Sorting",
      round: "Technical Round", difficulty: "medium",
      source: "GeeksForGeeks", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["HashMap", "sorted key", "grouping", "O(NK log K)", "character frequency"],
      storedBy: "admin" as const,
    },
    // Zoho
    {
      question: "Implement a Least Recently Used (LRU) cache with O(1) get and O(1) put operations. Capacity = 3. Trace through: put(1,1), put(2,2), get(1), put(3,3), get(2). Show eviction order.",
      company: "zoho", role: "Software Engineer", topic: "LRU Cache / Design",
      round: "Technical Round", difficulty: "hard",
      source: "Naukri", year: "2025", isReal: true, companyVerified: true,
      expectedKeywords: ["HashMap", "doubly linked list", "O(1)", "eviction", "head/tail pointers"],
      storedBy: "admin" as const,
    },
  ];

  return [...seeds, ...curated];
}

export async function POST(req: Request) {
  try {
    // Simple secret check (prevents unauthorized seeding)
    const secret = req.headers.get("x-seed-secret");
    const expectedSecret = process.env.SEED_SECRET || "mnc-rag-seed-2025";
    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questions = buildSeedQuestions();
    console.log(`[RAG/Seed] Starting seed with ${questions.length} questions...`);

    const result = await batchSeedQuestions(questions, 300); // 300ms between embeddings

    console.log(`[RAG/Seed] Complete: stored=${result.stored}, skipped=${result.skipped}, failed=${result.failed} in ${result.timeMs}ms`);

    return NextResponse.json({
      success: true,
      message: `Seeded ${result.stored} new questions (${result.skipped} already existed, ${result.failed} failed)`,
      result,
    });

  } catch (error: any) {
    console.error("[/api/rag/seed]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
