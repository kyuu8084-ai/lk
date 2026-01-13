import React, { useState } from 'react';
import { Exam } from '../types';

interface Props {
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

const ExamCountdown: React.FC<Props> = ({ exams, onAddExam, onDeleteExam }) => {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !date) return;
    onAddExam({
      id: Date.now().toString(),
      subject,
      date
    });
    setSubject('');
    setDate('');
  };

  const getDaysLeft = (targetDate: string) => {
    const diff = new Date(targetDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden mt-8">
      <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 text-white flex items-center gap-2">
        <i className="fas fa-hourglass-half text-xl"></i>
        <h2 className="text-xl font-bold font-serif">Đếm Ngược Ngày Thi</h2>
      </div>

      <div className="p-4">
        {/* Exam List */}
        <div className="space-y-3 mb-4 max-h-[250px] overflow-y-auto scrollbar-hide">
          {exams && exams.length > 0 ? (
            exams.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(exam => {
              const days = getDaysLeft(exam.date);
              const isUrgent = days <= 3 && days >= 0;
              const isPast = days < 0;

              return (
                <div key={exam.id} className={`flex justify-between items-center p-3 rounded-lg border ${isUrgent ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-gray-50 dark:bg-gray-700 border-gray-100 dark:border-gray-600'}`}>
                  <div>
                    <div className="font-bold text-gray-800 dark:text-white">{exam.subject}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Ngày: {new Date(exam.date).toLocaleDateString('vi-VN')}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-center px-3 py-1 rounded-lg ${isPast ? 'bg-gray-300 text-gray-600' : isUrgent ? 'bg-red-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                      <div className="text-lg font-bold leading-none">{isPast ? 'Hết' : days}</div>
                      <div className="text-[10px] uppercase font-bold">{isPast ? 'hạn' : 'ngày'}</div>
                    </div>
                    <button onClick={() => onDeleteExam(exam.id)} className="text-gray-400 hover:text-red-500">
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-400 text-sm py-2">Chưa có lịch thi nào.</p>
          )}
        </div>

        {/* Add Form */}
        <form onSubmit={handleSubmit} className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-5 gap-2">
            <input 
              type="text" 
              placeholder="Môn thi..." 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="col-span-3 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-primary outline-none"
            />
            <input 
              type="date" 
              value={date}
              onChange={e => setDate(e.target.value)}
              className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm focus:border-primary outline-none"
            />
          </div>
          <button type="submit" className="w-full mt-2 bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 rounded-lg text-sm transition-colors">
            Thêm lịch thi
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExamCountdown;