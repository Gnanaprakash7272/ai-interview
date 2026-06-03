# 🎙️ Mockora.ai - AI-Powered Video Interview Platform

![Mockora.ai Banner](https://img.shields.io/badge/AI_Interview-Mockora.ai-blue?style=for-the-badge&logo=openai)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-orange?style=for-the-badge&logo=google)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green?style=for-the-badge&logo=mongodb)

Mockora.ai is a cutting-edge, fully automated AI mock interview platform designed to help candidates prepare for real-world corporate interviews. It simulates a professional video conferencing environment where a highly intelligent AI recruiter (powered by Google Gemini) conducts real-time, adaptive voice interviews.

## ✨ Key Features

- **🗣️ Live Speech-to-Speech AI:** Talk directly to the AI! Built-in Speech Recognition and Text-to-Speech (TTS) provide a completely hands-free, real-time voice interview experience.
- **🇮🇳 Native Indian Voice Accent:** The AI recruiter features a highly realistic Indian English accent (en-IN), speaking at a calm, professional, and easily understandable pace.
- **🏢 Top 50 MNC Question Bank:** Contains real interview patterns and questions from the world's top 50 tech companies (Google, Amazon, TCS, Infosys, etc.).
- **⚡ Single-Pass Gemini Architecture:** Optimized Google Gemini 2.5 API integration merges answer evaluation and dynamic next-question generation into a single request, completely eliminating rate-limits and making responses 2x faster.
- **📊 Granular Data-Analyst Evaluation:** After the interview, receive a highly detailed, mathematically consistent JSON scorecard with metrics for Technical Accuracy, Communication, Confidence, Fluency, and Problem Solving.
- **🎥 Professional Video-Call UI:** Edge-to-edge, stunning Zoom/Teams-style dark mode interface with immersive animations and layout.

## 🛠️ Tech Stack

- **Frontend:** Next.js 14, React, Tailwind CSS, Lucide Icons
- **Backend:** Next.js API Routes (Serverless)
- **Database:** MongoDB (Mongoose)
- **Authentication:** NextAuth.js (Google OAuth)
- **AI Engine:** Google Gemini 2.5 Flash SDK (`@google/genai`)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB URI
- Google Gemini API Key
- Google OAuth Credentials

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Gnanaprakash7272/ai-interview.git
   cd ai-interview
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret
   GOOGLE_ID=your_google_oauth_client_id
   GOOGLE_SECRET=your_google_oauth_client_secret
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## 🧠 How the AI Works (Architecture)

Mockora.ai utilizes a custom **Data Analyst & Corporate HR Persona Prompt** for Gemini. When a candidate answers a question:
1. The app captures the audio, converts it to text, and calculates speaking speed/hesitations.
2. The entire conversation history and current answer are sent to Gemini in a single pass.
3. Gemini evaluates the response mathematically (0-100 scores) and dynamically generates the *exact next conversational question* based on the candidate's performance.
4. The AI speaks the generated question back to the candidate via Browser TTS.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

---
*Built with ❤️ by Gnana Prakash.*
