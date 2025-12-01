import { GoogleGenAI, Type, Chat } from "@google/genai";
import { KnowledgeNode, ChatMessage, StudyConfig, StudyMaterial } from "../types";

const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

let chatSession: Chat | null = null;

// Helper to clean JSON string if Markdown code blocks are present
const cleanJsonString = (str: string): string => {
  return str.replace(/^```json\s*/, '').replace(/\s*```$/, '');
};

const prepareContentParts = (materials: StudyMaterial[]) => {
  return materials.map(m => {
    if (m.type === 'text') {
      return { text: m.content };
    } else {
      return {
        inlineData: {
          mimeType: m.mimeType || 'application/pdf', // Fallback to PDF if undefined
          data: m.content
        }
      };
    }
  });
};

export const digestMaterial = async (materials: StudyMaterial[], durationMinutes: number): Promise<KnowledgeNode> => {
  const modelId = 'gemini-2.5-flash';
  
  const systemInstruction = `You are an expert study planner. 
  Your goal is to break down the provided study materials (which may be PDFs, documents, or text) into a hierarchical Mind Map structure.
  The total study session is intended to last ${durationMinutes} minutes.
  Ensure the breakdown is logical and covers all key concepts found in the documents.
  Return ONLY valid JSON.`;

  const promptText = `Analyze the attached materials and create a knowledge tree.
  
  The output must follow this schema:
  {
    "id": "root",
    "name": "Main Topic Title",
    "children": [
      { "id": "unique_id_1", "name": "Subtopic", "details": "Short summary", "children": [...] }
    ]
  }`;

  const parts: any[] = prepareContentParts(materials);
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts }, 
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            details: { type: Type.STRING },
            children: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  details: { type: Type.STRING },
                  children: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT, 
                      properties: {
                         id: { type: Type.STRING },
                         name: { type: Type.STRING },
                         details: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(cleanJsonString(jsonText));
  } catch (error) {
    console.error("Error digesting material:", error);
    // Return a graceful fallback instead of crashing
    return {
      id: "root",
      name: "Study Material (Processing Error)",
      children: [
        { 
          id: "error-1", 
          name: "Processing Failed", 
          details: "The study material might be too large or invalid. Please try fewer pages or convert to text.",
          children: []
        }
      ]
    };
  }
};

export const initChatSession = async (materials: StudyMaterial[], config: StudyConfig, topic: string) => {
    const modelId = 'gemini-2.5-flash';
    
    const systemInstruction = `You are ${config.partnerName}, the user's study partner.
    You are currently studying: "${topic}".
    Your personality is: ${config.personality}.
    Your IQ is estimated at ${config.iqLevel}.
    
    You have access to the study materials provided in the context.
    Use them to answer questions, ask questions, and guide the user.
    
    If your IQ is high (>140), be very precise, insightful.
    If your IQ is average, be relatable and helpful.
    
    Keep responses relatively concise (under 100 words) unless explaining a complex topic.
    `;

    chatSession = ai.chats.create({
        model: modelId,
        config: { systemInstruction }
    });

    // We "seed" the chat with the documents so they are in context for the session.
    // This mimics uploading the docs to the partner.
    const parts: any[] = prepareContentParts(materials);
    parts.push({ text: `Here are the study materials for our session on "${topic}". Please read them and confirm you are ready.` });
    
    try {
      // Send the initial payload with files. 
      // Important: 'message' accepts string | Part[]. 
      await chatSession.sendMessage({ message: parts }); 
    } catch (e) {
      console.error("Failed to init chat with files", e);
    }
};

export const generateQuizQuestion = async (topic: string, difficulty: number): Promise<ChatMessage> => {
    // If we have an active session, use it to generate a quiz based on the full context!
    // If not (setup phase?), fallback to simple generation.
    
    if (!chatSession) {
         return {
            id: Date.now().toString(),
            sender: 'partner',
            text: "Chat session not initialized.",
            timestamp: Date.now(),
            type: 'text'
        };
    }

    const difficultyDesc = difficulty > 130 ? "highly complex and nuanced" : difficulty < 100 ? "straightforward and basic" : "moderate";

    const prompt = `Create a single multiple-choice question based on the topic: "${topic}" and the materials we have.
    The question should be ${difficultyDesc}.
    Return JSON format: { "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
    DO NOT output markdown formatting like \`\`\`json, just the raw JSON string.`;

    try {
        const response = await chatSession.sendMessage({ message: prompt });
        const text = cleanJsonString(response.text || "{}");
        const data = JSON.parse(text);
        
        return {
            id: Date.now().toString(),
            sender: 'partner',
            text: data.question,
            timestamp: Date.now(),
            type: 'quiz',
            quizOptions: data.options,
            correctAnswer: data.correctIndex
        };
    } catch (e) {
        // Fallback if model refuses JSON or errors
        return {
            id: Date.now().toString(),
            sender: 'partner',
            text: `Let's review ${topic}. What do you think is the most important takeaway?`,
            timestamp: Date.now(),
            type: 'text'
        };
    }
};

export const chatWithPartner = async (
    userMessage: string
): Promise<string> => {
    if (!chatSession) return "I'm not ready yet.";

    try {
        const response = await chatSession.sendMessage({ message: userMessage });
        return response.text || "...";
    } catch (e) {
        console.error(e);
        return "Sorry, I'm having trouble processing that right now.";
    }
};