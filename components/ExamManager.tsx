import React, { useState } from 'react';
import { Exam, EXAM_TAGS } from '../types';

interface Props {
  exams: Exam[];
  onAddExam: (exam: Exam) => void;
  onDeleteExam: (id: string) => void;
}

type SortOption = 'date-asc' | 'date-desc' | 'subject' | 'days-left';

const ExamManager: React.FC<Props> = ({ exams, onAddExam, onDeleteExam }) => {
  const [sortBy, setSortBy] = useState<SortOption>('days-left');
  const [filterTag, setFilterTag] = useState<string>('Tất cả');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form State
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTag, setNewTag] = useState(EXAM_TAGS[0]);

  const getDaysLeft = (targetDate: string) => {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = target.getTime() - now.getTime();
    return Math.round(diff / (1000 * 3600 * 24));
  };

  // Filter first
  const filteredExams = exams.filter(e => {
    if (filterTag === 'Tất cả') return true;
    return e.tag === filterTag;
  });

  // Then Sort
  const sortedExams = [...filteredExams].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    
    const daysA = getDaysLeft(a.date);
    const daysB = getDaysLeft(b.date);
    const isPastA = daysA < 0;
    const isPastB = daysB < 0;

    if (sortBy === 'subject') {
      return a.subject.localeCompare(b.subject);
    } else if (sortBy === 'date-desc') {
      return timeB - timeA;
    } else if (sortBy === 'date-asc') {
      return timeA - timeB;
    } else if (sortBy === 'days-left') {
      if (isPastA && !isPastB) return 1;
      if (!isPastA && isPastB) return -1;
      if (!isPastA && !isPastB) return timeA - timeB;
      else return timeB - timeA;
    }
    return 0;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newDate) return;
    
    onAddExam({
      id: Date.now().toString(),
      subject: newSubject,
      date: newDate,
      description: newDesc,
      tag: newTag
    });
    
    setNewSubject('');
    setNewDate('');
    setNewDesc('');
    setNewTag(EXAM_TAGS[0]);
    setShowAddForm(false);
  };

  const getTagColor = (tag?: string) => {
    switch(tag) {
      case 'Giữa kỳ': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Cuối kỳ': return 'bg-red-100 text-red-700 border-red-200';
      case 'Quiz': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Thuyết trình': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Deadline': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col animate-fadeIn">
      {/* Controls Header */}
      <div className="flex flex-col gap-4 mb-4">
        {/* Top Row: Add Button & Sort */}
        <div className="flex justify-between items-center">
          <div className="text-sm font-bold text-slate-500">Lọc & Sắp xếp:</div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:shadow-pink-500/30 transition-all active:scale-95 whitespace-nowrap"
          >
            <i className={`fas ${showAddForm ? 'fa-minus' : 'fa-plus'} mr-2`}></i>
            {showAddForm ? 'Đóng' : 'Thêm Lịch Thi'}
          </button>
        </div>

        {/* Filter Tags Row */}
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
             onClick={() => setFilterTag('Tất cả')}
             className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border transition-all ${filterTag === 'Tất cả' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            Tất cả
          </button>
          {EXAM_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => setFilterTag(tag)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border transition-all ${filterTag === tag ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Sort Options */}
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg overflow-x-auto">
          <button onClick={() => setSortBy('days-left')} className={`flex-1 min-w-[100px] py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'days-left' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-hourglass-start mr-1"></i> Đếm ngược
          </button>
          <button onClick={() => setSortBy('date-asc')} className={`flex-1 min-w-[100px] py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'date-asc' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-calendar-alt mr-1"></i> Ngày (Tăng)
          </button>
          <button onClick={() => setSortBy('subject')} className={`flex-1 min-w-[100px] py-1.5 rounded-md text-xs font-bold transition-all ${sortBy === 'subject' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>
            <i className="fas fa-font mr-1"></i> Tên
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 bg-white/50 dark:bg-slate-800/50 p-4 rounded-2xl border border-pink-200 dark:border-pink-900/30 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Môn thi</label>
              <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-pink-500/50 dark:text-white" placeholder="VD: Giải tích 1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày thi</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-pink-500/50 dark:text-white" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại kỳ thi</label>
               <select value={newTag} onChange={e => setNewTag(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-pink-500/50 dark:text-white">
                 {EXAM_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú</label>
              <input type="text" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-pink-500/50 dark:text-white" placeholder="Phòng thi..." />
            </div>
          </div>
          <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 rounded-xl hover:bg-pink-600 transition-colors">
            Lưu Lịch Thi
          </button>
        </form>
      )}

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-4 pr-2 custom-scrollbar flex-1">
        {sortedExams.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-10 opacity-60">
            <i className="fas fa-filter text-6xl mb-4"></i>
            <p>Không tìm thấy lịch thi phù hợp.</p>
          </div>
        ) : (
          sortedExams.map(exam => {
            const daysLeft = getDaysLeft(exam.date);
            const isPast = daysLeft < 0;
            const isUrgent = daysLeft >= 0 && daysLeft <= 3;
            const isToday = daysLeft === 0;

            return (
              <div key={exam.id} className="group relative bg-white dark:bg-slate-700 p-5 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm hover:shadow-md transition-all">
                <button 
                  onClick={() => {
                    if(confirm('Xóa lịch thi này?')) onDeleteExam(exam.id);
                  }}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <i className="fas fa-trash"></i>
                </button>

                <div className="flex items-start gap-4">
                  {/* Date Box */}
                  <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl shadow-inner flex-shrink-0 ${isPast ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : isUrgent ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
                    <span className="text-2xl font-black leading-none">{new Date(exam.date).getDate()}</span>
                    <span className="text-[10px] font-bold uppercase">Thg {new Date(exam.date).getMonth() + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                       {exam.tag && (
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${getTagColor(exam.tag)}`}>
                           {exam.tag}
                         </span>
                       )}
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight truncate" title={exam.subject}>{exam.subject}</h3>
                    {exam.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 italic truncate">
                        {exam.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                       <div className={`text-xs font-bold px-2 py-1 rounded-full ${isPast ? 'bg-slate-200 text-slate-500' : isUrgent ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-green-100 text-green-600'}`}>
                         {isPast ? 'Đã thi xong' : isToday ? 'Hôm nay thi!' : `Còn ${daysLeft} ngày`}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExamManager;