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
       Sample questions to draw inspiration from for this company:
       ${companyInfo.sampleQuestions.map((q: string) => `- ${q}`).join("\n")}
       You must align the interview style, technical rigor, and question choices to match ${companyInfo.name}'s standards.`;
  } else if (targetCompany && companyKey !== "general") {
    const companyDisplayName = targetCompany.charAt(0).toUpperCase() + targetCompany.slice(1);
    companyPrompt = `Target Company: ${companyDisplayName}
       Since the target company is ${companyDisplayName}, you must align the interview style, typical technical rigor, focus areas, and coding standards to match ${companyDisplayName}'s real-world recruitment process. If they are known for specific topics (e.g., networking for Cisco, finance/scale for banking, enterprise Java/consulting for IT service firms, DSA/scalable systems for big tech), adapt your questions accordingly.`;
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
        prompt = `You are an expert AI Technical Interviewer, HR Interviewer, and Hiring Manager conducting a real mock interview.

${candidateContext}
Difficulty Level: ${difficulty}
Interview Focus: ${interviewType} (technical, hr, or mixed)
Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, 'hi' in Hindi, 'ja' in Japanese, 'en' in English).

${companyPrompt}

${roundInstructions}

${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

Since this is the FIRST question:
1. Welcome the candidate briefly (1 sentence) addressing them by name${companyInfo && companyKey !== "general" ? `, and mention that they are interviewing for ${companyInfo.name}` : ""}.
2. Explicitly announce that you are starting the first round as per the CURRENT INTERVIEW STAGE.
3. Ask a highly relevant first interview question tailored specifically to the candidate's skills and experience level. If a resume is provided, ask about a specific project or skill on it. If skills are provided, ask about one of their listed skills.

Output ONLY the final spoken recruiter message. Do not include any HTML, markdown, tags, or JSON.`;
      } else {
        const historyText = history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join("\n\n");
        prompt = `You are an expert AI Technical Interviewer conducting a conversational mock interview.

${candidateContext}
Difficulty Level: ${difficulty}
Interview Focus: ${interviewType} (technical, hr, or mixed)
Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, 'hi' in Hindi, 'ja' in Japanese, 'en' in English).

${companyPrompt}

${roundInstructions}

${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

Conversation History:
${historyText}

Generate the NEXT conversational follow-up question.
Guidelines:
1. Address ${candidateName || "the candidate"} by name occasionally to keep it natural.
2. CRITICAL: Read the candidate's last answer closely. If they ask to "repeat the question", or say they don't understand, DO NOT move on. Simply repeat your previous question in a slightly simplified way.
3. If they gave a vague or incomplete answer, ask a follow-up digging deeper into their technical choice or explanation.
4. If they answered well, move on to the next related technical topic or increase difficulty.
5. Keep the conversation extremely natural, strict, and professional like a real human recruiter.
6. Output ONLY the final spoken recruiter question. Do not include any tags, markdown, or JSON.`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
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
  skills?: string[]
): Promise<FeedbackResult> {
  if (!answer || answer.trim().length < 5) {
    return {
      score: 15,
      technicalAccuracy: 10,
      communication: 15,
      confidence: 10,
      fluency: 15,
      grammarScore: 2,
      clarityScore: 2,
      problemSolvingScore: 1,
      hiringRecommendation: "Reject",
      round: "Technical Round",
      expectedAnswer: "A complete answer should define the core concept, outline its implementation, explain trade-offs, and provide a real-world use case.",
      strengths: ["Attempted to respond"],
      weaknesses: ["Answer is extremely brief or silent.", "No descriptive technical details provided."],
      suggestions: ["Speak clearly and in full sentences.", "Structure your answer: define → explain → example → trade-offs."],
      missingConcepts: ["Core definition", "Practical use-cases", "Underlying mechanics"],
      improvedAnswer: "Please speak clearly into the microphone. A complete answer should define the core concepts, outline implementation, and explain trade-offs."
    };
  }

  if (ai) {
    try {
      const prompt = `You are an expert Technical Interviewer, HR Interviewer, Placement Trainer, and Hiring Manager. Evaluate the candidate's answer to the interview question below.

Interview Context:
- Job Role: ${jobRole || "Software Developer"}
- Experience Level: ${experienceLevel || "Intermediate"}
- Candidate Skills: ${skills && skills.length > 0 ? skills.join(", ") : "General"}
- Language: ${language}

Question Asked: ${question}
Candidate's Answer: ${answer}
Answer Duration: ${duration} seconds
Speaking Speed: ${speakingSpeed.toFixed(1)} words per minute
Hesitation Count: ${hesitationCount} (filler words like "umm", "aaa", "like", "I don't know")

Evaluation Criteria:
1. Technical Accuracy (0-100): Correctness of concepts, depth, and relevance to the question and role.
2. Communication Skills (0-100): Clarity, grammar, vocabulary, and sentence structure.
3. Confidence (0-100): Steadiness, hesitation filler count, delivery confidence.
4. Fluency (0-100): Flow of explanation, smoothness, transitions between ideas.
5. Grammar Score (0-10): Grammatical correctness, sentence structure quality.
6. Clarity Score (0-10): How clearly the candidate communicated their answer.
7. Problem Solving Score (0-10): Analytical thinking, approach structure, and solution quality.

CRITICAL RULES:
- If the candidate's answer is irrelevant, gibberish, very short, or simply asks to "repeat the question", you MUST score Technical Accuracy as 0, Problem Solving as 0, and note this in weaknesses.
- Do NOT generate generic "A strong answer would define the concept..." text. Write a SPECIFIC, highly technical expected answer for the EXACT question asked.
- The improvedAnswer MUST be a highly professional, technically deep rewrite of the candidate's attempt. If they didn't attempt it, write a strong first-person answer they COULD have used.

Based on the evaluation, determine the interview Round (e.g., "Technical Round 1", "HR Round", "System Design Round").

Provide:
- strengths: at least 2 specific positive points (if they failed completely, put "None")
- weaknesses: at least 2 specific areas to improve
- suggestions: at least 2 actionable improvement tips
- missingConcepts: specific technical keywords they failed to mention
- expectedAnswer: SPECIFIC technical answer to the exact question (2-4 sentences, written as expert reference)
- improvedAnswer: rewrite the candidate's answer in a professional first-person developer tone in the target language

Also determine hiringRecommendation based on overall performance:
- "Strong Hire": Score >= 85, excellent technical accuracy and communication
- "Hire": Score >= 70, good performance with minor gaps
- "Weak Hire": Score >= 55, average performance with notable gaps
- "Reject": Score < 55, significant gaps in knowledge or communication

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
  "hiringRecommendation": "Strong Hire" | "Hire" | "Weak Hire" | "Reject",
  "round": string,
  "expectedAnswer": string,
  "strengths": string[] (at least 2 specific points),
  "weaknesses": string[] (at least 2 specific points),
  "suggestions": string[] (at least 2 actionable tips),
  "missingConcepts": string[] (concepts they missed),
  "improvedAnswer": string (improved answer in first person developer tone in ${language})
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
            hiringRecommendation: feedback.hiringRecommendation ?? "Weak Hire",
            round: feedback.round ?? "Technical Round",
            expectedAnswer: feedback.expectedAnswer ?? "",
            strengths: feedback.strengths ?? [],
            weaknesses: feedback.weaknesses ?? [],
            suggestions: feedback.suggestions ?? [],
            missingConcepts: feedback.missingConcepts ?? [],
            improvedAnswer: feedback.improvedAnswer ?? "",
          } as FeedbackResult;
        }
      }
    } catch (error) {
      console.error("Gemini Speech Evaluation failed, falling back to heuristic grading:", error);
    }
  }

  // Fallback heuristic engine
  const wordCount = answer.split(/\s+/).length;
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
