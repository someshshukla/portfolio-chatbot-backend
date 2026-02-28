require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// KNOWLEDGE BASE (SYSTEM INSTRUCTION)
// ==========================================
// The knowledge base is loaded from knowledge.md at startup.
// To update the chatbot's knowledge, edit knowledge.md and restart the server.
const knowledgeBase = fs.readFileSync(path.join(__dirname, 'knowledge.md'), 'utf8');

const SYSTEM_INSTRUCTION = `
You are an AI assistant for Somesh Shukla's portfolio website.
Somesh Shukla is a Software Engineer specializing in Generative AI, LLMs, and the MERN stack.
Be conversational, professional, and concise.

### KNOWLEDGE BASE:
${knowledgeBase}

If the user asks for Somesh's resume, CV, or contact details, provide a polite summary and append exactly "[ACTION:DOWNLOAD_RESUME]" at the end of your message.
`;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Convert messages to the format expected by the GenAI SDK
    // The google-genai SDK uses "user" and "model" as roles
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const currentMessage = messages[messages.length - 1].content;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...history,
        { role: 'user', parts: [{ text: currentMessage }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Chatbot backend running on port ${PORT}`);
});
