import { GoogleGenAI } from "@google/genai";
import { Schedule } from "../types";

const API_KEY = "AIzaSyDN_oDmYkgNkTuDiko53xD3lZEQW10zGuc";

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const parseScheduleImage = async (base64Image: string, mimeType: string, userInstruction: string): Promise<Schedule[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  // Dùng bản 1.5 Pro hoặc 2.0 Flash Exp đều được, nhưng 1.5 Pro ổn định hơn với Text tiếng Việt dài
  const modelId = 'gemini-1.5-pro-latest'; 

  const prompt = `
    Bạn là một học sinh Việt Nam đang xem ảnh Thời Khóa Biểu.
    Nhiệm vụ: Trích xuất lịch học từ ảnh này thành dữ liệu JSON.

    1. MỤC TIÊU:
       - Tìm lịch của lớp: "${userInstruction}".
       - Nếu không tìm thấy tên lớp này (hoặc người dùng không nhập), hãy lấy lịch của LỚP ĐẦU TIÊN hoặc CỘT CÓ NHIỀU CHỮ NHẤT.

    2. QUY TẮC ĐỌC:
       - Đọc từng dòng. Nếu thấy tên môn học (Toán, Lý, Hóa, SHCN, Chào cờ...), hãy ghi lại.
       - Cột "Thứ" (Thứ 2, Thứ 3...) thường nằm bên trái cùng. Nếu ô Thứ bị gộp (merged), hãy tự hiểu là Thứ đó áp dụng cho các tiết bên dưới.
       - Cột "Tiết" (1, 2, 3, 4, 5).

    3. QUY TẮC GIỜ (QUAN TRỌNG - TỰ ĐỘNG ĐIỀN NẾU KHÔNG THẤY GIỜ):
       Nếu trên ảnh không ghi rõ giờ (7h00...), hãy dùng chuẩn sau:
       - Sáng Tiết 1: 07:00 - 07:45
       - Sáng Tiết 2: 07:50 - 08:35
       - Sáng Tiết 3: 08:45 - 09:30
       - Sáng Tiết 4: 09:40 - 10:25
       - Sáng Tiết 5: 10:30 - 11:15
       - Chiều Tiết 1: 12:45 - 13:30
       - Chiều Tiết 2: 13:35 - 14:20
       - Chiều Tiết 3: 14:25 - 15:10
       - Chiều Tiết 4: 15:20 - 16:05

    4. OUTPUT FORMAT (JSON ONLY):
       Trả về MỘT mảng JSON duy nhất. Không giải thích, không Markdown.
       [
         { "subject": "Toán", "day": "Thứ 2", "startTime": "07:00", "endTime": "07:45" },
         { "subject": "Văn", "day": "Thứ 2", "startTime": "07:50", "endTime": "08:35" }
       ]
  `;

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
          temperature: 0.2, // Thấp để chính xác
        }
      });

      if (response.text) {
        let cleanText = response.text.trim();
        
        // Cố gắng lọc lấy phần JSON giữa dấu ngoặc vuông []
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1) {
            cleanText = cleanText.substring(firstBracket, lastBracket + 1);
        } else {
             // Fallback: Xóa các ký tự markdown nếu không tìm thấy [] chuẩn
             cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
        }

        try {
            const parsed = JSON.parse(cleanText);
            
            if (Array.isArray(parsed) && parsed.length > 0) {
                 return parsed.map((item: any) => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    subject: item.subject || "Môn không tên",
                    day: item.day || "Thứ 2",
                    startTime: item.startTime || "07:00",
                    endTime: item.endTime || "07:45"
                 }));
            }
        } catch (jsonError) {
            console.error("JSON Parse Error (Raw Text):", response.text);
        }
      }
      
      // Nếu không parse được hoặc text rỗng
      throw new Error("AI response invalid");

    } catch (error: any) {
      console.error(`Attempt ${attempts + 1} Error:`, error);
      attempts++;
      
      if (error.message?.includes('503') || error.message?.includes('429')) {
        await delay(2000); 
        continue;
      }
    }
  }

  // Nếu sau 3 lần vẫn lỗi, ném lỗi ra ngoài để UI hiển thị
  throw new Error("Không thể nhận dạng môn học nào. Vui lòng chụp ảnh rõ nét hơn hoặc cắt bớt các phần thừa.");
};

export const geminiService = {
  parseScheduleImage
};