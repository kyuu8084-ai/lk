import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

// API Key được cấu hình trực tiếp theo yêu cầu
const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // CHUYỂN VỀ MODEL ỔN ĐỊNH: gemini-1.5-flash
  // Model này có giới hạn request cao hơn nhiều so với bản exp, tránh lỗi 429/Overloaded
  const modelId = 'gemini-1.5-flash';

  const prompt = `
    You are a data extraction assistant. Analyze this school timetable image.
    Extract class sessions into a strict JSON format based on the user instruction.

    --- USER INSTRUCTION START ---
    ${userInstruction ? userInstruction : "Extract all classes normally."}
    --- USER INSTRUCTION END ---
    
    CRITICAL RULES:
    1. Output strictly valid JSON.
    2. Days: "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật".
    3. Times: 24-hour format "HH:mm". 
       - If only periods (Tiết) are visible, map them:
       - Morning: 1(07:00-07:45), 2(07:50-08:35), 3(08:45-09:30), 4(09:35-10:20), 5(10:25-11:10).
       - Afternoon: 1(12:45-13:30), 2(13:35-14:20), 3(14:30-15:15), 4(15:20-16:05), 5(16:10-16:55).
    4. Subject: Keep full text (e.g., "Toán - Thầy A" -> "Toán - Thầy A").
    5. Ignore empty slots.

    Return ONLY the JSON array.
  `;

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
        temperature: 0.1, // Low temperature for consistent data extraction
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
      const parsed = JSON.parse(response.text);
      // Add unique IDs to ensure React renders lists correctly
      return parsed.map((item: any) => ({
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));
    }
    return [];

  } catch (error: any) {
    console.error("AI Error:", error);
    
    let msg = "Không thể nhận dạng ảnh. Vui lòng thử lại.";
    
    // Xử lý các mã lỗi cụ thể
    if (error.message?.includes('400')) msg = "Lỗi định dạng ảnh (400). Hãy thử chụp lại ảnh rõ nét hơn hoặc crop gọn vào phần bảng.";
    if (error.message?.includes('429')) msg = "Hệ thống đang bận (429). Vui lòng đợi 5 giây rồi thử lại.";
    if (error.message?.includes('500') || error.message?.includes('503')) msg = "Máy chủ AI đang bảo trì. Vui lòng thử lại sau.";
    
    throw new Error(msg);
  }
};

export const geminiService = {
  parseScheduleImage
};