import { GoogleGenAI } from "@google/genai";
import companyQuestions from "../data/companyQuestions.json";

// Initialize Gemini Client safely
let ai: any = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE" && apiKey.trim() !== "") {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI client:", error);
  }
}

export interface FeedbackResult {
  // Existing 0-100 fields (preserved for backward compatibility)
  score: number;
  technicalAccuracy: number;
  communication: number;
  confidence: number;
  fluency: number;

  // New granular 0-10 sub-scores
  grammarScore: number;
  clarityScore: number;
  problemSolvingScore: number;

  // New qualitative fields
  hiringRecommendation: "Strong Hire" | "Hire" | "Weak Hire" | "Reject";
  round: string;
  expectedAnswer: string;

  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingConcepts: string[];
  improvedAnswer: string;
  nextQuestion?: string;
  
  // Relevance and Keyword match
  answerRelevance: number;
  expectedKeywords: string[];
  coveredKeywords: string[];
  
  // MediaPipe Behavioural Metrics
  eyeContactScore?: number;
  engagementScore?: number;
}

export interface CareerGuidanceResult {
  skillsToLearn: string[];
  weakTopicsToImprove: string[];
  recommendedCertifications: string[];
  learningRoadmap: string[];
}

/**
 * Generates next conversational / adaptive question based on interview progress.
 */
export async function generateNextConversationalQuestion(
  jobRole: string,
  difficulty: string,
  interviewType: string,
  language: string,
  history: { question: string; answer: string }[],
  resumeText?: string,
  jobDescriptionText?: string,
  targetCompany?: string,
  candidateName?: string,
  skills?: string[],
  experienceLevel?: string,
  totalQuestions?: number
): Promise<string> {
  const isFirstQuestion = history.length === 0;
  const currentQuestionNumber = history.length + 1;

  // Retrieve company specific parameters if any
  const companyKey = targetCompany?.toLowerCase() || "general";
  const companyInfo = (companyQuestions as any)[companyKey];

  let companyPrompt = "";
  if (companyInfo && companyKey !== "general") {
    companyPrompt = `Target Company: ${companyInfo.name}
       Interview Style & Technical Focus for this Company: ${companyInfo.focus}
       
       MANDATORY COMPANY-SPECIFIC RECRUITER GUIDELINES:
       You MUST conduct the interview exactly like a real senior technical interviewer from ${companyInfo.name}. Each target company has a highly distinct technical bar and interview profile:
       1. "Zoho": Focus strictly on core programming logic, dry-running loops/nested conditions, custom string manipulations, recursive puzzles, and L2 Low-Level Design (LLD) scenarios (like Call Taxi Booking system, Railway Reservation system, or Snake & Ladder game logic). Avoid theoretical cloud-scaling jargon.
       2. "Google": Focus heavily on complex Data Structures and Algorithms (DSA) (such as Graphs, Trees, Dynamic Programming, Segment Trees, Backtracking, and Binary Search) and high-scale system design. Bar for code optimization, time complexity (Big-O), and edge cases is extremely high.
       3. "Amazon": Integrate Amazon's Leadership Principles (like Customer Obsession, Ownership, Bias for Action) into situational questions. Technical focus is on resilient microservice design, AWS cloud integrations, and robust data structures.
       4. "Stripe" or "Paypal": Focus on API design, idempotency key implementations, race conditions in double-spending, database transactions/locks, and high security.
       5. "Netflix": Focus on CDN caching, content replication, fault-tolerant microservice architectures, chaos engineering principles, and high-throughput streaming pipelines.
       6. "Cisco" or "Qualcomm": Focus on low-level OS internals, TCP/IP networking sockets, RTOS scheduling, low-level C pointers, buffer overflows, and memory alignments.
       7. "Meta" or "Apple": Focus on front-end complexity (DOM tree parsing, infinite scrolling, React rendering lifecycle) or product UI/UX hardware performance tradeoffs.
       8. Other Companies:
          - Service-Based (TCS, Infosys, Wipro, Cognizant, Accenture, Deloitte): Focus on OOPs principles, basic database schema normalize/SQL joins, and core Java/Python syntax.
          - Product Startup (Flipkart, Swiggy, Zomato): Focus on hyperlocal matching, geohashing/quadtrees, search indexing, and real-time geospatial location tracking.
       
       MANDATORY SAMPLE QUESTIONS TO ADAPT OR USE:
       Prioritize asking these exact sample questions or highly related variants that test the same underlying data structures/systems logic:
       ${companyInfo.sampleQuestions.map((q: string) => `- ${q}`).join("\n")}
       
       Adjust your tone, technical expectations, and questions to strictly match ${companyInfo.name}'s actual recruitment standards.`;
  } else if (targetCompany && companyKey !== "general") {
    const companyDisplayName = targetCompany.charAt(0).toUpperCase() + targetCompany.slice(1);
    companyPrompt = `Target Company: ${companyDisplayName}
       Since the target company is ${companyDisplayName}, you must align the interview style, technical focus, and questions to match ${companyDisplayName}'s real recruitment standards. Focus on their domain (e.g., networking for Cisco, scale/databases for Oracle/SAP, parallel GPU computing for NVIDIA/Intel, e-commerce supply chains for Walmart).`;
  }

  // Build candidate context for personalization
  const candidateContext = `
Candidate Profile:
- Name: ${candidateName || "Candidate"}
- Job Role: ${jobRole.replace(/_/g, " ")}
- Experience Level: ${experienceLevel || difficulty}
- Skills / Tech Stack: ${skills && skills.length > 0 ? skills.join(", ") : "General"}
`;

  // Build round-wise progression instructions
  let roundInstructions = "";
  if (totalQuestions && totalQuestions >= 3) {
    const isMixed = interviewType.toLowerCase().includes("mixed");
    const isTech = interviewType.toLowerCase().includes("technical");
    
    if (isMixed) {
      const techQ = Math.ceil(totalQuestions * 0.4);
      const designQ = Math.ceil(totalQuestions * 0.3);
      if (currentQuestionNumber <= techQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 1 - Core Technical/Coding. Focus strictly on coding logic, problem-solving, algorithms, or language-specific concepts.";
      } else if (currentQuestionNumber <= techQ + designQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 2 - System Design & Architecture. Focus on scaling, databases, architectural trade-offs, or advanced framework concepts.";
      } else {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 3 - HR & Behavioral. Focus on culture fit, leadership, situational scenarios (STAR method), and behavioral questions.";
      }
    } else if (isTech) {
      const basicsQ = Math.max(1, Math.floor(totalQuestions * 0.33));
      const algoQ = Math.max(1, Math.floor(totalQuestions * 0.33));
      if (currentQuestionNumber <= basicsQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 1 - Core Fundamentals. Focus on language basics, OOPs, database basics, and core concepts.";
      } else if (currentQuestionNumber <= basicsQ + algoQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 2 - Advanced Data Structures & Algorithms. Focus on complex problem solving, performance, and complexity.";
      } else {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 3 - System Design & Best Practices. Focus on architectural design, scalability, and code maintainability.";
      }
    } else {
      const pastQ = Math.max(1, Math.floor(totalQuestions * 0.33));
      const sitQ = Math.max(1, Math.floor(totalQuestions * 0.33));
      if (currentQuestionNumber <= pastQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 1 - Introduction & Past Experience. Focus on resume walkthrough, past projects, and role fit.";
      } else if (currentQuestionNumber <= pastQ + sitQ) {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 2 - Behavioral & Situational. Focus on conflict resolution, time management, and hypothetical scenarios.";
      } else {
        roundInstructions = "CURRENT INTERVIEW STAGE: Round 3 - Company Fit & Motivation. Focus on why they want to join, their long-term goals, and alignment with company culture.";
      }
    }
    
    roundInstructions += `\nCRITICAL RULE: If the user just transitioned into a NEW round, you MUST explicitly announce the transition gracefully in your spoken text. E.g., "Great, let's move on to the System Design round..."`;
  }

  if (ai) {
    try {
      let prompt = "";
      if (isFirstQuestion) {
        prompt = `You are a professional and experienced Corporate Interviewer. Your goal is to conduct highly realistic, adaptive mock interviews for candidates.
Core Responsibilities:
Interview Structure: Follow a structured approach based on the number of questions. If the interview has multiple rounds, transition seamlessly between them. When moving to a new round, explicitly announce it.
Realism: Adapt the difficulty, technical rigor, and interview style to the specific company the candidate is targeting. Use industry-standard terminology.
Conversational Flow: Act like a real human recruiter. Be warm, supportive, and professional. Ask only one question at a time and wait for the candidate's response.

${candidateContext}
Difficulty Level: ${difficulty}
Interview Focus: ${interviewType} (technical, hr, or mixed)
Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, etc.).

${companyPrompt}

${companyKey !== "general" ? `MANDATORY LIVE WEB SEARCH GROUNDING:
- You MUST use the Google Search tool to search for real, recent interview experiences, rounds, and questions asked at ${companyInfo?.name || targetCompany} for the '${jobRole.replace(/_/g, " ")}' role (specifically on platforms like GeeksforGeeks, Glassdoor, LeetCode, InterviewBit, AmbitionBox).
- Scrape these search results to extract actual coding challenges, system design topics, or behavioral questions asked at this company.
- You must base your first interview question directly on these real, scraped questions rather than making up generic ones. Ensure the question matches the current stage/round.` : ""}

${roundInstructions}

CRITICAL DATA STRUCTURES & CODING INSTRUCTIONS:
- If the interview focus is "technical" or "mixed", you MUST ask real, realistic data structures (DS) and algorithmic coding problems.
- Do NOT ask generic, abstract questions like "Explain what an array is." or "What is polymorphism?".
- Instead, ask concrete, specific coding challenges (e.g., "Given an array of integers containing duplicates, how would you find the first duplicate element in O(N) time using a HashSet? Walk me through your logic.") or algorithmic design questions (e.g., "How would you implement a custom Queue using two Stacks? Detail the push and pop operation complexities.").
- Format the coding problems with clear requirements, inputs, constraints, and ask the candidate to explain their choice of data structures, dry-run, or pseudo-code approach out loud.
- For Zoho target company, prioritize asking practical array dry runs, custom string operations, recursion exercises, or L2 system design scenarios (like taxi allocation logic, employee hierarchy tree traversal).

${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

Since this is the FIRST question:
1. Welcome the candidate briefly addressing them by name${companyInfo && companyKey !== "general" ? `, and mention that they are interviewing for ${companyInfo.name}` : ""}.
2. Explicitly announce that you are starting the first round as per the CURRENT INTERVIEW STAGE.
3. Ask a highly relevant first interview question tailored specifically to the candidate's skills and experience.

Constraints:
Output ONLY the final spoken recruiter message.
Do NOT include any JSON, Markdown tags, labels (like "Interviewer:"), or internal reasoning in the final output.
Keep the tone encouraging but strictly professional, just like a real interview panel.`;
      } else {
        const historyText = history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join("\n\n");
        prompt = `You are a professional and experienced Corporate Interviewer. Your goal is to conduct highly realistic, adaptive mock interviews for candidates.
Core Responsibilities:
Interview Structure: Follow a structured approach based on the number of questions. If the interview has multiple rounds, transition seamlessly between them. When moving to a new round, explicitly announce it.
Realism: Adapt the difficulty, technical rigor, and interview style to the specific company the candidate is targeting. Use industry-standard terminology.
Conversational Flow: Act like a real human recruiter. Be warm, supportive, and professional. Ask only one question at a time and wait for the candidate's response.
Adaptive Feedback:
If the candidate is vague, ask a follow-up to dig deeper.
If they are incorrect, professionally correct them before moving on.
If they ask to repeat the question or don't understand, rephrase the question more simply.

${candidateContext}
Difficulty Level: ${difficulty}
Interview Focus: ${interviewType} (technical, hr, or mixed)
Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, etc.).

${companyPrompt}

${companyKey !== "general" ? `MANDATORY LIVE WEB SEARCH GROUNDING:
- You MUST use the Google Search tool to search for real, recent interview experiences, rounds, and questions asked at ${companyInfo?.name || targetCompany} for the '${jobRole.replace(/_/g, " ")}' role (specifically on platforms like GeeksforGeeks, Glassdoor, LeetCode, InterviewBit, AmbitionBox).
- Scrape these search results to extract actual coding challenges, system design topics, or behavioral questions asked at this company.
- Base the next question directly on these real-world scraped questions matching the current round, continuing the conversational flow.` : ""}

${roundInstructions}

CRITICAL DATA STRUCTURES & CODING INSTRUCTIONS:
- If the interview focus is "technical" or "mixed", you MUST ask real, realistic data structures (DS) and algorithmic coding problems.
- Do NOT ask generic, abstract questions like "Explain what an array is." or "What is polymorphism?".
- Instead, ask concrete, specific coding challenges (e.g., "Given an array of integers containing duplicates, how would you find the first duplicate element in O(N) time using a HashSet? Walk me through your logic.") or algorithmic design questions (e.g., "How would you implement a custom Queue using two Stacks? Detail the push and pop operation complexities.").
- Format the coding problems with clear requirements, inputs, constraints, and ask the candidate to explain their choice of data structures, dry-run, or pseudo-code approach out loud.
- For Zoho target company, prioritize asking practical array dry runs, custom string operations, recursion exercises, or L2 system design scenarios (like taxi allocation logic, employee hierarchy tree traversal).

${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

Conversation History:
${historyText}

Generate the NEXT conversational follow-up question.
Guidelines:
1. Address ${candidateName || "the candidate"} by name occasionally to keep it personal.
2. If they ask to "repeat the question", rephrase the question more simply.
3. If they give a wrong answer, professionally correct them before moving on.
4. Keep the tone encouraging but strictly professional.

Constraints:
Output ONLY the final spoken recruiter message.
Do NOT include any JSON, Markdown tags, labels (like "Interviewer:"), or internal reasoning in the final output.`;
      }

      const configObj: any = {};
      if (companyKey !== "general") {
        configObj.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: configObj
      });

      if (response && response.text) {
        return response.text.trim();
      }
    } catch (error) {
      console.error("Gemini conversational question generation failed:", error);
    }
  }

  // Fallbacks if Gemini is not set up
  const name = candidateName || "Candidate";
  if (isFirstQuestion) {
    if (language === "ta") {
      return companyKey !== "general"
        ? `வணக்கம் ${name}, ${companyInfo.name} நேர்காணலுக்கு உங்களை வரவேற்கிறேன். உங்களைப் பற்றி சுருக்கமாக அறிமுகப்படுத்துங்கள்.`
        : `வணக்கம் ${name}, நேர்காணலுக்கு உங்களை வரவேற்கிறேன். உங்களைப் பற்றி சுருக்கமாக அறிமுகப்படுத்துங்கள்.`;
    }
    if (language === "ja") return `こんにちは ${name}さん、面接へようこそ。簡単に自己紹介をしてください。`;
    if (language === "hi") return `नमस्कार ${name}, साक्षात्कार में आपका स्वागत है। कृपया अपना संक्षिप्त परिचय दें।`;
    if (language === "te") return `నమస్కారం ${name}, ఇంటర్వ్యూకి స్వాగతం. దయచేసి మిమ్మల్ని మీరు పరిచయం చేసుకోండి.`;
    return companyKey !== "general"
      ? `Hello ${name}, welcome to your ${companyInfo.name} interview. Can you please introduce yourself and walk me through your experience with ${skills && skills.length > 0 ? skills[0] : "your core skills"}?`
      : `Hello ${name}, welcome to your mock interview. Can you please introduce yourself and walk me through your technical background?`;
  } else {
    const lastAnswer = history[history.length - 1]?.answer || "";
    if (language === "ta") return `நீங்கள் கூறிய '${lastAnswer.slice(0, 15)}...' என்பது புரிகிறது. இதன் தொழில்நுட்ப பயன்பாடு மற்றும் சவால்கள் பற்றி விரிவாக கூற முடியுமா?`;
    return "Interesting. Can you expand on the design choices, trade-offs, and any challenges you faced in this scenario?";
  }
}

/**
 * Grades a candidate answer using Gemini with full scoring dimensions.
 */
export async function evaluateAnswer(
  question: string,
  answer: string,
  duration: number,
  speakingSpeed: number,
  hesitationCount: number,
  language: string,
  jobRole?: string,
  experienceLevel?: string,
  skills?: string[],
  history?: { question: string; answer: string }[],
  isLastQuestion?: boolean,
  targetCompany?: string,
  mediaPipeMetrics?: {
    eyeContactScore: number;
    headStabilityScore: number;
    faceVisibilityScore: number;
    engagementScore: number;
  }
): Promise<FeedbackResult> {
  const wordCount = answer ? answer.trim().split(/\s+/).length : 0;
  if (!answer || wordCount < 5) {
    return {
      score: 10,
      technicalAccuracy: 0,
      communication: 15,
      confidence: 10,
      fluency: 10,
      grammarScore: 1,
      clarityScore: 1,
      problemSolvingScore: 0,
      answerRelevance: 0,
      hiringRecommendation: "Reject",
      round: "Technical Round",
      expectedAnswer: "A complete answer should define the core concept, outline its implementation, explain trade-offs, and provide a real-world use case.",
      strengths: ["None (Answer was too short)"],
      weaknesses: ["Answer is extremely brief or silent.", "No descriptive technical details provided."],
      suggestions: ["Speak clearly and in full sentences.", "Structure your answer: define → explain → example → trade-offs."],
      missingConcepts: ["Core definition", "Practical use-cases", "Underlying mechanics"],
      expectedKeywords: ["Definition", "Implementation", "Example", "Trade-offs"],
      coveredKeywords: [],
      improvedAnswer: "Please speak clearly into the microphone and provide a detailed, technical response.",
      nextQuestion: isLastQuestion ? undefined : "Can you elaborate on your previous experience?"
    };
  }

  if (ai) {
    try {
      const historyText = history && history.length > 0 
        ? history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join("\n\n") 
        : "None (This is the first question evaluated)";

      const prompt = `Act as an expert evaluator, data analyst, and technical interviewer. Your task is to evaluate the candidate's answer and, if the interview is not over, dynamically generate the NEXT highly contextual interview question based on their performance.

Interview Context:
- Job Role: ${jobRole || "Software Developer"}
- Experience Level: ${experienceLevel || "Intermediate"}
- Candidate Skills: ${skills && skills.length > 0 ? skills.join(", ") : "General"}
- Language: ${language}
- Target Company: ${targetCompany || "General"}

Conversation History So Far:
${historyText}

Current Question Asked: ${question}
Candidate's Answer: ${answer}
Voice Analytics:
* Speaking Speed: ${speakingSpeed.toFixed(1)} WPM
* Response Duration: ${duration} seconds
* Hesitations: ${hesitationCount} (filler words)

MediaPipe Metrics (if available):
* Eye Contact Score: ${mediaPipeMetrics?.eyeContactScore ?? "N/A"}
* Head Stability Score: ${mediaPipeMetrics?.headStabilityScore ?? "N/A"}
* Face Visibility Score: ${mediaPipeMetrics?.faceVisibilityScore ?? "N/A"}
* Engagement Score: ${mediaPipeMetrics?.engagementScore ?? "N/A"}

Evaluation Criteria:
Evaluate both technical performance and behavioural performance.

Technical Evaluation:
1. Technical Accuracy (0-100)
2. Problem Solving Ability (0-10)
3. Communication Quality (0-100)
4. Grammar Quality (0-10)
5. Clarity of Explanation (0-10)
6. Answer Relevance (0-10): How relevant the answer is to the question asked. 0 means completely off-topic or hallucinated.

Behaviour Evaluation:
7. Confidence Level (0-100)
8. Fluency (0-100)
9. Eye Contact Quality (0-10)
10. Interview Engagement (0-10)

CRITICAL RULES FOR HALLUCINATION & RELEVANCE:
- Do NOT give high scores for irrelevant answers.
- If the answer does not address the question (e.g., "Anaconda Anaconda" for HashMap), contains random/repeated words, or does not attempt to answer:
  - You MUST set Technical Accuracy to 0-2 (out of 100).
  - You MUST set Answer Relevance to 0-2 (out of 10).
  - You MUST set Problem Solving Score, Grammar Score, and Clarity Score to 0-2.
  - Do NOT reward fluency or confidence for irrelevant answers. They should also be strictly penalized.
  - Set hiringRecommendation to "Reject".
  - Include "Off-topic response" or "No relevant concepts" in weaknesses.

CRITICAL RULES FOR KEYWORD MATCHING:
- Identify 4-6 'expectedKeywords' that a perfect answer should include.
- Identify which of those expected keywords were actually mentioned/covered by the candidate in 'coveredKeywords'.

BEHAVIOURAL RULES:
- Eye contact alone should not increase hiring recommendations.
- Technical knowledge remains the primary factor.
- Behavioural metrics should be used as supporting signals only.

OTHER CRITICAL RULES:
- MATHEMATICAL CONSISTENCY: The overall 'score' (0-100) MUST be a logical, weighted average of the sub-scores (Technical Accuracy, Communication, Confidence, Fluency).
- The expectedAnswer MUST be SPECIFIC and highly technical for the EXACT question asked.
- The improvedAnswer MUST be a VERY SHORT and CONCISE correction (maximum 2-3 sentences).
- If isLastQuestion is false, you MUST generate the 'nextQuestion'. The next question should logically follow the evaluation.
- If isLastQuestion is true, 'nextQuestion' should be null.
- isLastQuestion = ${isLastQuestion ? "true" : "false"}

Provide:
- strengths: at least 2 specific positive points (if they failed completely, put "None")
- weaknesses: at least 2 specific areas to improve (previously areasForImprovement)
- suggestions: at least 2 actionable improvement tips
- missingConcepts: specific technical keywords they failed to mention
- expectedKeywords: 4-6 critical concepts/keywords expected for the question
- coveredKeywords: subset of expectedKeywords that the candidate successfully covered
- expectedAnswer: SPECIFIC technical answer to the exact question (2-4 sentences, written as expert reference)
- improvedAnswer: CRITICAL: Provide a VERY SHORT and CONCISE correction or improvement (maximum 2-3 sentences).
- nextQuestion: The spoken text of the next question to ask the candidate (or null if isLastQuestion is true). Ensure it is in ${language}.

Determine hiringRecommendation STRICTLY based on these rules:
- Technical Accuracy < 40 (out of 100) -> "Reject"
- Answer Relevance < 4 (out of 10) -> "Reject"
- Grammar Score < 3 (out of 10) -> "Weak Hire" (unless rejected by above rules)
- Overall Score > 80 -> "Hire" or "Strong Hire"
- Otherwise, use your best judgment.

Return a single JSON object with this exact shape:
{
  "score": number (0 to 100, overall weighted average),
  "technicalAccuracy": number (0 to 100),
  "communication": number (0 to 100),
  "confidence": number (0 to 100),
  "fluency": number (0 to 100),
  "grammarScore": number (0 to 10),
  "clarityScore": number (0 to 10),
  "problemSolvingScore": number (0 to 10),
  "answerRelevance": number (0 to 10),
  "eyeContactScore": number (0 to 10),
  "engagementScore": number (0 to 10),
  "hiringRecommendation": "Strong Hire" | "Hire" | "Weak Hire" | "Reject",
  "round": string,
  "expectedAnswer": string,
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": string[],
  "missingConcepts": string[],
  "expectedKeywords": string[],
  "coveredKeywords": string[],
  "improvedAnswer": string,
  "nextQuestion": string | null
}

Return ONLY the raw JSON string. Do not wrap in markdown tags or code blocks.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response && response.text) {
        const feedback = JSON.parse(response.text.trim());
        if (
          typeof feedback.score === "number" &&
          typeof feedback.technicalAccuracy === "number" &&
          typeof feedback.communication === "number"
        ) {
          // Ensure all new fields have defaults if Gemini doesn't return them
          return {
            score: feedback.score ?? 0,
            technicalAccuracy: feedback.technicalAccuracy ?? 0,
            communication: feedback.communication ?? 0,
            confidence: feedback.confidence ?? 0,
            fluency: feedback.fluency ?? 0,
            grammarScore: feedback.grammarScore ?? 5,
            clarityScore: feedback.clarityScore ?? 5,
            problemSolvingScore: feedback.problemSolvingScore ?? 5,
            answerRelevance: feedback.answerRelevance ?? 5,
            eyeContactScore: feedback.eyeContactScore ?? 0,
            engagementScore: feedback.engagementScore ?? 0,
            hiringRecommendation: feedback.hiringRecommendation ?? "Weak Hire",
            round: feedback.round ?? "Technical Round",
            expectedAnswer: feedback.expectedAnswer ?? "",
            strengths: feedback.strengths ?? [],
            weaknesses: feedback.weaknesses ?? [],
            suggestions: feedback.suggestions ?? [],
            missingConcepts: feedback.missingConcepts ?? [],
            expectedKeywords: feedback.expectedKeywords ?? [],
            coveredKeywords: feedback.coveredKeywords ?? [],
            improvedAnswer: feedback.improvedAnswer ?? "",
            nextQuestion: feedback.nextQuestion,
          } as FeedbackResult;
        }
      }
    } catch (error) {
      console.error("Gemini Speech Evaluation failed, falling back to heuristic grading:", error);
    }
  }

  // Fallback heuristic engine
  let techScore = Math.min(45 + (wordCount > 20 ? 20 : 0) + (wordCount > 50 ? 20 : 0), 90);
  let commScore = Math.min(50 + (hesitationCount < 3 ? 20 : 5) + (speakingSpeed > 100 && speakingSpeed < 160 ? 20 : 5), 92);
  let confScore = Math.max(100 - (hesitationCount * 12), 40);
  let fluScore = Math.min(Math.round((commScore + confScore) / 2), 95);
  let gramScore = Math.min(Math.round(commScore / 10), 10);
  let clarScore = Math.min(Math.round((techScore + commScore) / 20), 10);
  let psScore = Math.min(Math.round(techScore / 10), 10);
  const overallScore = Math.round((techScore + commScore + confScore + fluScore) / 4);

  let hiringRec: FeedbackResult["hiringRecommendation"] = "Reject";
  if (overallScore >= 85) hiringRec = "Strong Hire";
  else if (overallScore >= 70) hiringRec = "Hire";
  else if (overallScore >= 55) hiringRec = "Weak Hire";

  return {
    score: overallScore,
    technicalAccuracy: techScore,
    communication: commScore,
    confidence: confScore,
    fluency: fluScore,
    grammarScore: gramScore,
    clarityScore: clarScore,
    problemSolvingScore: psScore,
    answerRelevance: Math.min(Math.round((techScore + commScore) / 20), 10),
    hiringRecommendation: hiringRec,
    round: "Technical Round",
    expectedAnswer: "A strong answer should define the concept clearly, explain its implementation, provide a real-world example, and discuss trade-offs or limitations.",
    strengths: [
      wordCount > 30 ? "Good overall word volume and detail coverage." : "Answered the prompt directly.",
      hesitationCount < 3 ? "Exhibited highly fluent speech with minimal hesitation fillers." : "Kept trying to outline technical inputs."
    ],
    weaknesses: [
      wordCount < 40 ? "Explanation was short. Elaborate with system design or tooling examples." : "Ensure your answer structure follows a step-by-step layout.",
      hesitationCount >= 3 ? "Frequent hesitation fillers ('umm', 'aaa') detected. Practice speaking in steady streams." : "Could improve vocabulary precision."
    ],
    suggestions: [
      "Structure your answer: Define → Explain → Real Example → Trade-offs.",
      "Practice mock answers out loud to improve fluency and reduce filler words."
    ],
    missingConcepts: ["System trade-offs", "Production scalability constraints", "Real-world examples"],
    expectedKeywords: ["Definition", "Implementation", "Real-world example", "Trade-offs"],
    coveredKeywords: ["Definition"],
    improvedAnswer: "To improve, explain the concept clearly, detail why you used it, mention performance implications, and outline design choices in a professional tone."
  };
}

/**
 * Generates dynamic career roadmap and guidance.
 */
export async function generateCareerGuidance(
  jobRole: string,
  difficulty: string,
  overallScore: number,
  responses: { question: string; answer: string; weaknesses: string[]; missingConcepts: string[] }[]
): Promise<CareerGuidanceResult> {
  const defaultGuidance = {
    skillsToLearn: ["System Architecture", "Tradeoff Analysis", "Advanced Tooling"],
    weakTopicsToImprove: ["Technical depth", "Scalability explanation", "Steadiness of voice"],
    recommendedCertifications: ["AWS Certified Solutions Architect", "Associate Developer Credentials"],
    learningRoadmap: ["Phase 1: Strengthen core protocols", "Phase 2: Practice scenario designs", "Phase 3: Do timed speaking mock tests"]
  };

  if (ai) {
    try {
      const summaryText = responses.map(r => `Question: ${r.question}\nWeaknesses: ${r.weaknesses.join(", ")}\nMissing: ${r.missingConcepts.join(", ")}`).join("\n\n");
      const prompt = `Act as an expert career counselor and mock recruiter. Review the candidate's interview session:
      Job Role: ${jobRole}
      Difficulty: ${difficulty}
      Overall Performance Score: ${overallScore}/100

      Session Analysis:
      ${summaryText}

      Based on their weaknesses and missing concepts, generate:
      1. Skills to learn (3 points)
      2. Weak topics to improve (3 points)
      3. Recommended certifications matching their role and difficulty (2 points)
      4. A brief 3-step learning roadmap to get them ready for high-paying interviews.

      You must return a single JSON object with this exact shape:
      {
        "skillsToLearn": string[],
        "weakTopicsToImprove": string[],
        "recommendedCertifications": string[],
        "learningRoadmap": string[]
      }
      
      Return ONLY the raw JSON string. Do not wrap in markdown tags.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response && response.text) {
        return JSON.parse(response.text.trim()) as CareerGuidanceResult;
      }
    } catch (e) {
      console.error("Failed to generate career guidance with Gemini:", e);
    }
  }

  return defaultGuidance;
}

/**
 * Generates user-level overall recommendations based on completed interviews.
 */
export async function generateGeneralRecommendations(feedbackHistory: any[]): Promise<string[]> {
  if (feedbackHistory.length === 0) {
    return [
      "Select a domain and complete your first mock interview to get custom suggestions.",
      "Review basic concepts in your selected stack before starting your interview."
    ];
  }

  const averageScore = feedbackHistory.reduce((sum, item) => sum + (item.totalScore || 0), 0) / feedbackHistory.length;

  if (ai) {
    try {
      const summaryText = feedbackHistory.map(item => `Domain: ${item.domain}, Difficulty: ${item.difficulty}, Score: ${item.totalScore}`).join("; ");
      const prompt = `Based on the user's technical interview history: ${summaryText}. The user's average score is ${averageScore.toFixed(1)}/100.
      Generate exactly 3 actionable, high-quality, professional technical advice points / suggestions for their study path.
      Return the result as a raw JSON array of strings. Do not include markdown formatting or tags.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      if (response && response.text) {
        const recommendations = JSON.parse(response.text.trim());
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          return recommendations.slice(0, 3);
        }
      }
    } catch (e) {
      console.error("Failed to generate recommendations with AI:", e);
    }
  }

  // Fallbacks
  if (averageScore < 60) {
    return [
      "Focus heavily on structural fundamentals: spend more time detailing concepts and defining basic definitions accurately.",
      "Supplement your learning by writing short code snippets for each topic to strengthen technical accuracy.",
      "Practice structured explanation methods, such as the STAR method (Situation, Task, Action, Result) for explaining technical work."
    ];
  } else if (averageScore < 80) {
    return [
      "Enhance your answers by discussing real-world trade-offs, scalability, and performance optimizations.",
      "Explain the 'why' behind choices, comparing your approach to alternative patterns (e.g. SQL vs NoSQL or CSS grid vs flexbox).",
      "Work on vocabulary precision by using exact engineering terminology rather than general descriptions."
    ];
  } else {
    return [
      "Excellent technical core. Now, focus on system architecture, design patterns, and edge-case handling.",
      "Practice speaking or typing under time pressure to simulate high-stress live coding panels.",
      "Explore advanced topics like performance profiling, microservices design, or frontend concurrent rendering."
    ];
  }
}
