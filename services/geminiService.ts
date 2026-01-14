import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Schedule } from "../types";

// API Key được cấu hình trực tiếp để chạy trên trình duyệt
const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelId = 'gemini-3-flash-preview';

  // Prompt được tinh chỉnh đặc biệt cho loại bảng trong ảnh
  const prompt = `
    Analyze this Vietnamese School Timetable image.

    STRUCTURE OF THE IMAGE:
    - Column 1: "Thứ" (Day) - Merged cells spanning multiple rows (e.g., "2", "3", "4"... means Monday, Tuesday...).
    - Column 2: "Buổi" (Session) - "S" (Morning), "C" (Afternoon).
    - Column 3: "Tiết" (Period) - 1, 2, 3, 4, 5.
    - Column 4: "TG" (Time) - Format like "7g10" (07:10), "12g30" (12:30).
    - Next Columns: Class Names (e.g., 12E1, 12E2, 12A1...).

    USER REQUEST: "${userInstruction || 'Find the column for class 12A1'}"

    TASK:
    1. LOCATE THE COLUMN: Find the column header that matches the User Request. If not found/empty, pick the column "12A1" or the right-most class column.
    2. ITERATE ROWS: Go down the selected column.
    3. EXTRACT:
       - Subject: Text in the class column (e.g., "Toán-Nhơn", "Lý-D.Thúy"). Ignore empty cells.
       - Day: Look at Column 1. If merged/empty, use the value from the rows above. (Map: "2"->Thứ 2, "3"->Thứ 3...).
       - Time: Look at Column "TG". Convert "7g10" -> "07:10". Calculate End Time by adding 45 minutes to Start Time.
    
    CRITICAL RULES:
    - If "TG" column is readable, USE IT. Example: "7g10" -> "07:10".
    - If "TG" is unreadable, fallback to standard times:
      (S) Morning: P1=07:00, P2=07:50, P3=08:45, P4=09:35, P5=10:25.
      (C) Afternoon: P1=12:30, P2=13:15, P3=14:00, P4=14:45, P5=15:30.
    
    OUTPUT: JSON Array only.
  `;

  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        day: { type: Type.STRING },
        startTime: { type: Type.STRING },
        endTime: { type: Type.STRING },
      },
      required: ["subject", "day", "startTime", "endTime"],
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          subject: item.subject,
          day: item.day,
          startTime: item.startTime,
          endTime: item.endTime
        }));
      }
    }
    throw new Error("Empty response");

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    throw new Error("Không đọc được ảnh. Vui lòng nhập tên lớp (VD: 12A1) vào ô yêu cầu để AI biết cột nào.");
  }
};

export const geminiService = {
  parseScheduleImage
};