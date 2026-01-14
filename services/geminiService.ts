import { GoogleGenAI, Type } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // Sử dụng gemini-2.0-flash-exp vì khả năng nhìn (Vision) tốt nhất cho bảng biểu
  const modelId = 'gemini-2.0-flash-exp';

  const prompt = `
    You are an expert OCR engine for Vietnamese School Timetables (Thời Khóa Biểu). 
    Your task is to extract schedule data from a GRID/MATRIX image.

    --- STEP 1: LOCATE THE TARGET COLUMN ---
    User Instruction: "${userInstruction ? userInstruction : "AUTO-DETECT"}"
    
    1. Search the HEADER ROW for a column name that matches the User Instruction (e.g., if user says "12a1", look for "12A1", "Lớp 12A1", "12 A1").
    2. If User Instruction is empty or not found, identify the MAIN column containing subject names.
    3. Focus ONLY on this column. Ignore other class columns (like 12A2, 12A3...).

    --- STEP 2: SCAN & MAP (CRITICAL) ---
    Iterate through every row of the Target Column:
    1. If the cell contains a Subject (e.g., "Toán", "Văn", "CC", "SHCN"):
       - LOOK FAR LEFT to the first column ("Thứ").
       - LOOK FAR LEFT to the second/third column ("Tiết", "TG").
    
    --- STEP 3: HANDLE MERGED CELLS ---
    - The "Thứ" (Day) column often has MERGED CELLS (one big cell spanning multiple rows). 
    - RULE: If a row has no text in the "Thứ" column, use the value from the row above it. (e.g., Row 1 is "Thứ 2", Row 2 is empty -> It is still "Thứ 2").

    --- STEP 4: TIME CONVERSION ---
    - Convert "7g00" -> "07:00".
    - If only "Tiết" (Period) is visible:
      Sáng (Morning): 1=07:00, 2=07:50, 3=08:45, 4=09:35, 5=10:25.
      Chiều (Afternoon): 1=12:45, 2=13:35, 3=14:30, 4=15:20, 5=16:10.

    --- STEP 5: OUTPUT ---
    Return STRICTLY a JSON Array. NO Markdown blocks.
    [
      { "subject": "Toán", "day": "Thứ 2", "startTime": "07:00", "endTime": "07:45" },
      { "subject": "Văn", "day": "Thứ 3", "startTime": "08:45", "endTime": "09:30" }
    ]
  `;

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
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Image } },
            { text: prompt }
          ]
        },
        config: {
          safetySettings: safetySettings as any, 
          temperature: 0.1, // Low temperature for precision
          responseMimeType: "application/json",
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        // Force extract JSON array if wrapped in text
        const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
        if (jsonMatch) cleanText = jsonMatch[0];
        else cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');

        try {
            const parsed = JSON.parse(cleanText);
            
            if (!Array.isArray(parsed) || parsed.length === 0) {
               console.warn("AI returned empty array.", response.text);
               if (attempts < 2) throw new Error("Empty Result");
            }

            return parsed.map((item: any) => ({
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              subject: item.subject || "Môn học",
              day: item.day || "Thứ 2",
              startTime: item.startTime || "07:00",
              endTime: item.endTime || "07:45"
            }));
        } catch (parseError) {
            console.error("JSON Parse Error:", response.text);
            throw new Error("Lỗi đọc dữ liệu từ AI.");
        }
      }
      return [];

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} failed:`, error);
      attempts++;
      
      if (error.message?.includes('503') || error.message?.includes('429')) {
        await delay(2000 * attempts); 
        continue;
      }

      if (attempts === 3) {
         // Thông báo lỗi thân thiện hơn
         let msg = "Không thể đọc được lịch.";
         if (error.message?.includes('Empty Result')) msg = "AI không tìm thấy môn học nào trong cột bạn yêu cầu.";
         throw new Error(msg);
      }
    }
  }
  return [];
};

export const geminiService = {
  parseScheduleImage
};