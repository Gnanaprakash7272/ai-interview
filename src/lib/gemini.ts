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
  score: number;
  technicalAccuracy: number;
  communication: number;
  confidence: number;
  fluency: number;
  strengths: string[];
  weaknesses: string[];
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
  targetCompany?: string
): Promise<string> {
  const isFirstQuestion = history.length === 0;

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

  if (ai) {
    try {
      let prompt = "";
      if (isFirstQuestion) {
        prompt = `Act as an expert AI Recruiter conducting a mock interview.
        Job Role: ${jobRole}
        Difficulty Level: ${difficulty}
        Interview Focus: ${interviewType} (technical, hr, or mixed)
        Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, 'hi' in Hindi, 'ja' in Japanese, 'en' in English).

        ${companyPrompt}

        ${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
        ${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

        Since this is the FIRST question:
        1. Welcome the candidate briefly (1 sentence) in the target language${companyInfo && companyKey !== "general" ? `, mentioning that they are interviewing for ${companyInfo.name}` : ""}.
        2. Ask a highly relevant first interview question based on the job role, difficulty, focus, and company style guidelines. If a resume is provided, ask about a project or skill listed on it.
        
        Output ONLY the final spoken recruiter message. Do not include any HTML, markdown, tags, or JSON.`;
      } else {
        const historyText = history.map((h, i) => `Q${i+1}: ${h.question}\nA${i+1}: ${h.answer}`).join("\n\n");
        prompt = `Act as an expert AI Recruiter conducting a conversational mock interview.
        Job Role: ${jobRole}
        Difficulty Level: ${difficulty}
        Interview Focus: ${interviewType} (technical, hr, or mixed)
        Language: ${language} (respond strictly in the selected language. If it is 'ta' respond in Tamil, 'te' in Telugu, 'hi' in Hindi, 'ja' in Japanese, 'en' in English).

        ${companyPrompt}

        ${resumeText ? `Candidate's Resume:\n${resumeText}\n` : ""}
        ${jobDescriptionText ? `Target Job Description:\n${jobDescriptionText}\n` : ""}

        Conversation History:
        ${historyText}

        Generate the NEXT conversational follow-up question.
        Guidelines:
        1. Read the candidate's last answer. If they provided a vague or incomplete answer, ask a follow-up digging deeper into their technical choice or explanation (e.g., "Why did you use EC2 instead of Lambda?").
        2. If their answer was complete, move on to the next logical concept or behavioral scenario that fits ${companyInfo && companyKey !== "general" ? `${companyInfo.name}'s typical` : "the target"} interview style.
        3. Keep the conversation extremely natural, like a real human recruiter.
        4. Output ONLY the final spoken recruiter question. Do not include any tags, markdown, or JSON.`;
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
  if (isFirstQuestion) {
    if (language === "ta") {
      return companyKey !== "general" 
        ? `வணக்கம், ${companyInfo.name} நேர்காணலுக்கு உங்களை வரவேற்கிறேன். உங்களைப் பற்றி சுருக்கமாக அறிமுகப்படுத்துங்கள்.`
        : "வணக்கம், நேர்காணலுக்கு உங்களை வரவேற்கிறேன். உங்களைப் பற்றி சுருக்கமாக அறிமுகப்படுத்துங்கள்.";
    }
    if (language === "ja") return "こんにちは、面接へようこそ。簡単に自己紹介をしてください。";
    if (language === "hi") return "नमस्कार, साक्षात्कार में आपका स्वागत है। कृपया अपना संक्षिप्त परिचय दें।";
    if (language === "te") return "నమస్కారం, ఇంటర్వ్యూకి స్వాగతం. దయచేసి మిమ్మల్ని మీరు పరిచయం చేసుకోండి.";
    return companyKey !== "general"
      ? `Hello, welcome to your ${companyInfo.name} interview. Can you please introduce yourself and outline your core project experiences?`
      : "Hello, welcome to your interview. Can you please introduce yourself and outline your core project experiences?";
  } else {
    const lastAnswer = history[history.length - 1]?.answer || "";
    if (language === "ta") return `நீங்கள் கூறிய '${lastAnswer.slice(0, 15)}...' என்பது புரிகிறது. இதன் தொழில்நுட்ப பயன்பாடு மற்றும் சவால்கள் பற்றி விரிவாக கூற முடியுமா?`;
    return "Interesting. Can you expand on the scaling challenges, design choices, and tradeoffs you faced in this scenario?";
  }
}

/**
 * Grades a voice answer using Gemini, factoring in speaking metrics.
 */
export async function evaluateAnswer(
  question: string,
  answer: string,
  duration: number,
  speakingSpeed: number,
  hesitationCount: number,
  language: string
): Promise<FeedbackResult> {
  if (!answer || answer.trim().length < 5) {
    return {
      score: 15,
      technicalAccuracy: 10,
      communication: 15,
      confidence: 10,
      fluency: 15,
      strengths: ["Attempted to log a response"],
      weaknesses: ["Answer is extremely brief or silent.", "No descriptive technical details provided."],
      missingConcepts: ["Core definition", "Practical use-cases", "Underlying mechanics"],
      improvedAnswer: "Please speak clearly into the microphone. A complete answer should define the core concepts, outline implementation, and explain tradeoffs."
    };
  }

  if (ai) {
    try {
      const prompt = `Act as an expert technical mock recruiter. Grade the candidate's spoken answer.
      
      Question Asked: ${question}
      Candidate's Transcribed Spoken Answer: ${answer}
      Speaking Duration: ${duration} seconds
      Speaking Speed: ${speakingSpeed.toFixed(1)} words per minute
      Hesitation Count: ${hesitationCount} (instances of fillers like "umm", "aaa", "like", "i don't know", etc.)
      Language: ${language}

      Evaluate the response based on the following:
      1. Technical Accuracy: Correctness of concepts, details, depth, and relevance.
      2. Communication Skills: Clarity, grammar, vocabulary, sentence structure.
      3. Confidence Analysis: Steadiness of voice, hesitation fillers count, and confidence level.
      4. Fluency Analysis: Flow of explanation, smoothness, transitions.

      Provide constructive strengths and weaknesses. Also outline "missingConcepts" which the candidate failed to cover. Give an "improvedAnswer" written in first-person developer tone in the target language.

      You must return a single JSON object with this exact shape:
      {
        "score": number (0 to 100),
        "technicalAccuracy": number (0 to 100),
        "communication": number (0 to 100),
        "confidence": number (0 to 100),
        "fluency": number (0 to 100),
        "strengths": string[] (at least 2 points),
        "weaknesses": string[] (at least 2 points),
        "missingConcepts": string[] (concepts they missed),
        "improvedAnswer": string (improved answer in first person developer tone in the target language)
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
        const feedback = JSON.parse(response.text.trim());
        if (
          typeof feedback.score === "number" &&
          typeof feedback.technicalAccuracy === "number" &&
          typeof feedback.communication === "number"
        ) {
          return feedback as FeedbackResult;
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
  
  return {
    score: Math.round((techScore + commScore + confScore + fluScore) / 4),
    technicalAccuracy: techScore,
    communication: commScore,
    confidence: confScore,
    fluency: fluScore,
    strengths: [
      wordCount > 30 ? "Good overall word volume and detail coverage." : "Answered the prompt directly.",
      hesitationCount < 3 ? "Exhibited highly fluent speech with minimal hesitation fillers." : "Kept trying to outline technical inputs."
    ],
    weaknesses: [
      wordCount < 40 ? "Explanation was short. Elaborate with system design or tooling examples." : "Ensure your answer structure follows a step-by-step layout.",
      hesitationCount >= 3 ? "Frequent hesitation fillers ('umm', 'aaa') detected. Practice speaking in steady streams." : "Could improve vocabulary precision."
    ],
    missingConcepts: ["System tradeoffs", "Production scalability constraints", "Security credentials"],
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

