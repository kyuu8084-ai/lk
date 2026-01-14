import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

// --- CẤU HÌNH API KEY TẠI ĐÂY ---
const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const parseScheduleImage = async (base64Image: string, userInstruction: string): Promise<Schedule[]> => {
  // Kiểm tra xem biến API_KEY có giá trị không
  if (!API_KEY) {
    throw new Error("Missing API Key");
  }

  // Khởi tạo GoogleGenAI với key trực tiếp
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const prompt = `
    Analyze this image which is a school timetable (thời khóa biểu).
    Extract class sessions based on the USER INSTRUCTION below.

    --- USER INSTRUCTION START ---
    ${userInstruction ? userInstruction : "Extract all classes normally."}
    --- USER INSTRUCTION END ---
    
    General Rules:
    1. Days must be strictly mapped to Vietnamese: "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật".
    2. Times must be in 24-hour format "HH:mm" (e.g., 07:00, 13:30).
    3. If specific times are not shown but periods (Tiết) are shown, use standard Vietnamese school time:
        - Morning: P1(07:00-07:45), P2(07:50-08:35), P3(08:45-09:30), P4(09:35-10:20), P5(10:25-11:10).
        - Afternoon: P1(12:45-13:30), P2(13:35-14:20), P3(14:30-15:15), P4(15:20-16:05), P5(16:10-16:55).
    4. "1 môn tương ứng 1 tiết": Unless told to merge, treat each row/period as a separate entry.
    5. Ignore empty cells.
    6. CRITICAL: PRESERVE FULL TEXT. Do NOT shorten subject names. If a cell contains "Toán - Thầy Nhơn", the subject MUST be "Toán - Thầy Nhơn". If it contains "Lý (Cô Thủy)", keep it exactly as is. Do not remove teacher names.
    
    Return a clean JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg', 
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
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
      // Add IDs
      return parsed.map((item: any) => ({
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
      }));
    }
    return [];

  } catch (error) {
    console.error("AI Error:", error);
    throw new Error("Không thể nhận dạng ảnh. Vui lòng thử lại với ảnh rõ nét hơn.");
  }
};

export const geminiService = {
  parseScheduleImage
};