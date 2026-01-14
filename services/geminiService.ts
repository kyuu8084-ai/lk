import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

// Helper for sleep/delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // Sử dụng model stable nhất
  const modelId = 'gemini-1.5-flash';

  const prompt = `
    Analyze this school timetable image and extract class sessions into a strictly valid JSON array.

    --- USER INSTRUCTION ---
    ${userInstruction ? userInstruction : "Extract all classes normally."}
    
    RULES:
    1. Output strictly valid JSON. 
    2. Days: "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật".
    3. Times: "HH:mm" (24h). 
       If only periods (Tiết) are shown:
       Morning: 1(07:00-07:45), 2(07:50-08:35), 3(08:45-09:30), 4(09:35-10:20), 5(10:25-11:10).
       Afternoon: 1(12:45-13:30), 2(13:35-14:20), 3(14:30-15:15), 4(15:20-16:05), 5(16:10-16:55).
    4. Subject: Keep full text (e.g., "Toán - Thầy A").
    5. Ignore empty slots.
  `;

  // Use string values for safety settings to avoid Enum version conflicts
  const safetySettings = [
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  ];

  let attempts = 0;
  while (attempts < 3) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: base64Image
              }
            },
            { text: prompt }
          ]
        },
        config: {
          safetySettings: safetySettings as any, 
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                subject: { type: Type.STRING },
                day: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
              },
              required: ["subject", "day", "startTime", "endTime"]
            }
          }
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        
        // --- IMPROVED JSON EXTRACTION ---
        // Find the first '[' and the last ']' to ignore any preamble or postscript text
        const firstOpen = cleanText.indexOf('[');
        const lastClose = cleanText.lastIndexOf(']');
        
        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            cleanText = cleanText.substring(firstOpen, lastClose + 1);
        } else {
            // Fallback cleaning if brackets are messy
            cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanText);
            return parsed.map((item: any) => ({
              ...item,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
            }));
        } catch (parseError) {
            console.error("JSON Parse Error. Raw text:", response.text);
            throw new Error("AI trả về dữ liệu lỗi định dạng.");
        }
      }
      return [];

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      attempts++;
      
      // Retry on network/overload errors
      if (error.message?.includes('503') || error.message?.includes('429')) {
        await delay(2000 * attempts); 
        continue;
      }

      // Final attempt failure
      if (attempts === 3) {
         let msg = "Không thể nhận dạng ảnh. " + (error.message || "");
         if (error.message?.includes('400')) msg = "Lỗi ảnh (400). Hãy thử ảnh khác hoặc chụp rõ hơn.";
         if (error.message?.includes('SAFETY')) msg = "Ảnh bị chặn bởi bộ lọc an toàn.";
         if (error.message?.includes('API_KEY')) msg = "API Key không hợp lệ hoặc hết hạn.";
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};