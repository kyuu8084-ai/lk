import React, { useState, useEffect, useRef } from 'react';
import { Schedule, DAYS_OF_WEEK } from '../types';

interface Props {
  schedules: Schedule[];
  onDelete: (id: string) => void;
}

type ViewMode = 'grid' | 'list';
type SortType = 'day' | 'time' | 'subject';

// --- Sub-components for better organization ---

interface SingleScheduleItemProps {
  item: Schedule;
  onDelete: (id: string) => void;
  isInDropdown?: boolean;
}

const SingleScheduleItem: React.FC<SingleScheduleItemProps> = ({ item, onDelete, isInDropdown = false }) => (
  <div className={`relative w-full flex-shrink-0 bg-white dark:bg-slate-700 shadow-sm border-l-4 border-accent p-2 rounded-lg text-xs animate-fadeIn transform transition-transform hover:scale-[1.01] group cursor-default ${isInDropdown ? 'border-l-primary' : ''}`}>
      {/* Delete Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if(confirm('Bạn có chắc muốn xóa môn này?')) onDelete(item.id);
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-slate-600 text-red-500 border border-red-100 dark:border-slate-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white z-20 cursor-pointer"
        title="Xóa môn này"
      >
        <i className="fas fa-times text-[10px]"></i>
      </button>

      <div className="pr-1">
        <div className="font-bold text-slate-800 dark:text-white text-xs leading-tight mb-1 whitespace-normal break-words" title={item.subject}>
          {item.subject}
        </div>
      </div>

      <div className="mt-1">
        <div className="text-[10px] text-slate-500 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-900/50 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-full box-border">
          <i className="far fa-clock text-[9px] text-primary flex-shrink-0"></i>
          <span className="truncate">{item.startTime} - {item.endTime}</span>
        </div>
      </div>
  </div>
);

interface ScheduleCellContentProps {
  items: Schedule[];
  onDelete: (id: string) => void;
}

const ScheduleCellContent: React.FC<ScheduleCellContentProps> = ({ items, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  if (items.length === 0) return null;

  if (items.length === 1) {
    return <SingleScheduleItem item={items[0]} onDelete={onDelete} />;
  }

  return (
    <div className="relative w-full z-10" ref={dropdownRef}>
      {/* Group Header / Summary Card */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 border border-indigo-200 dark:border-slate-600 rounded-lg p-2 cursor-pointer shadow-sm hover:shadow-md transition-all group ${isExpanded ? 'ring-2 ring-primary/50' : ''}`}
      >
         <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-300">
               {items.length} Môn
            </span>
            <div className={`w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
               <i className="fas fa-chevron-down text-[8px] text-indigo-600 dark:text-indigo-300"></i>
            </div>
         </div>
         <div className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
            {items[0].subject}
         </div>
         <div className="text-[10px] text-slate-400 truncate mt-0.5 italic">
            & {items.length - 1} môn khác...
         </div>
      </div>

      {/* Dropdown Content */}
      {isExpanded && (
        <div className="absolute top-[calc(100%+5px)] left-0 w-[220px] md:w-[260px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 p-3 z-50 flex flex-col gap-2 animate-fadeIn origin-top-left">
           <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700 mb-1">
              <span className="text-xs font-bold text-slate-500 uppercase">
                <i className="fas fa-layer-group mr-1"></i>
                Chi tiết khung giờ
              </span>
              <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="text-slate-400 hover:text-red-500 px-2 transition-colors">
                 <i className="fas fa-times"></i>
              </button>
           </div>
           <div className="max-h-[250px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
              {items.map(item => (
                <SingleScheduleItem key={item.id} item={item} onDelete={onDelete} isInDropdown={true} />
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Main Component ---

const WeeklySchedule: React.FC<Props> = ({ schedules, onDelete }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState<SortType>('day');

  // Filter Logic
  const filteredSchedules = schedules.filter(s => 
    s.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort Logic (mainly for List view)
  const sortedSchedules = [...filteredSchedules].sort((a, b) => {
    if (sortType === 'subject') {
      return a.subject.localeCompare(b.subject);
    } else if (sortType === 'time') {
      // Sort by Time (HH:mm)
      return a.startTime.localeCompare(b.startTime);
    } else {
      // Sort by Day (using DAYS_OF_WEEK index)
      const dayIndexA = DAYS_OF_WEEK.indexOf(a.day);
      const dayIndexB = DAYS_OF_WEEK.indexOf(b.day);
      if (dayIndexA !== dayIndexB) return dayIndexA - dayIndexB;
      // If same day, sort by time
      return a.startTime.localeCompare(b.startTime);
    }
  });

  const hours = Array.from({ length: 17 }, (_, i) => i + 6); // 6:00 to 22:00

  return (
    <div className="flex flex-col h-full animate-fadeIn">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-4 items-center justify-between bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl backdrop-blur-sm border border-white/20">
        
        {/* Search Input */}
        <div className="relative w-full md:w-64 group">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors"></i>
          <input 
            type="text" 
            placeholder="Tìm kiếm môn học..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-primary/50 text-sm dark:text-white transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Sort Controls (Visible only in List Mode) */}
          {viewMode === 'list' && (
            <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
               <button onClick={() => setSortType('day')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${sortType === 'day' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Thứ</button>
               <button onClick={() => setSortType('time')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${sortType === 'time' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Giờ</button>
               <button onClick={() => setSortType('subject')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${sortType === 'subject' ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-400 hover:text-slate-600'}`}>Tên</button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-primary shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lưới"
            >
              <i className="fas fa-th"></i>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-primary shadow' : 'text-slate-400 hover:text-slate-600'}`}
              title="Danh sách"
            >
              <i className="fas fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'grid' ? (
          // GRID VIEW
          <div className="overflow-x-auto pb-4 rounded-xl w-full touch-pan-x h-full">
            {/* Min-width ensures columns don't get squashed on mobile */}
            <div className="min-w-[1000px] md:min-w-[1200px] inline-block align-middle pb-20">
              <div className="grid grid-cols-[70px_repeat(7,1fr)] gap-2">
                
                {/* Header Row */}
                <div className="p-2 md:p-3 flex items-center justify-center font-bold text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl sticky left-0 z-30 backdrop-blur-md shadow-sm border border-white/20">
                  <i className="far fa-clock text-lg md:text-xl"></i>
                </div>
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="p-2 md:p-3 text-center font-bold text-xs md:text-sm uppercase tracking-wider text-white bg-gradient-to-br from-primary to-secondary rounded-xl shadow-md flex items-center justify-center">
                    {day}
                  </div>
                ))}

                {/* Time Rows */}
                {hours.map(hour => (
                  <React.Fragment key={hour}>
                    {/* Sticky Time Column */}
                    <div className="sticky left-0 z-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="h-full w-full p-1 md:p-2 flex flex-col items-center justify-center font-bold text-xs md:text-sm text-slate-500">
                        <span>{hour}:00</span>
                      </div>
                    </div>
                    
                    {/* Schedule Cells */}
                    {DAYS_OF_WEEK.map(day => {
                      const classItems = filteredSchedules.filter(s => {
                        const startHour = parseInt(s.startTime.split(':')[0]);
                        return s.day === day && startHour === hour;
                      });

                      return (
                        <div key={`${day}-${hour}`} className="min-h-[100px] bg-white/40 dark:bg-slate-800/40 rounded-xl border border-white/50 dark:border-slate-700/50 p-1 md:p-2 flex flex-col justify-start transition-all hover:bg-white/60 dark:hover:bg-slate-800/60 relative">
                           {/* Render using the new Smart Cell Component */}
                           <ScheduleCellContent items={classItems} onDelete={onDelete} />
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // LIST VIEW
          <div className="overflow-y-auto h-full pb-20 pr-1 custom-scrollbar">
            {sortedSchedules.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedSchedules.map(item => (
                    <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                       <button 
                          onClick={() => {
                             if(confirm('Xóa môn học này?')) onDelete(item.id);
                          }}
                          className="absolute top-2 right-2 w-7 h-7 bg-slate-50 dark:bg-slate-700 text-slate-300 hover:text-red-500 rounded-full flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <i className="fas fa-times"></i>
                        </button>

                       <div className="flex items-center gap-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md ${
                            item.day === 'Chủ nhật' ? 'bg-red-500' : 'bg-primary'
                          }`}>
                             {item.day === 'Chủ nhật' ? 'CN' : item.day.replace('Thứ ', 'T')}
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-800 dark:text-white line-clamp-1" title={item.subject}>{item.subject}</h4>
                             <p className="text-xs text-slate-500 dark:text-slate-400">{item.day}</p>
                          </div>
                       </div>
                       
                       <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                          <i className="far fa-clock text-secondary"></i>
                          {item.startTime} - {item.endTime}
                       </div>
                    </div>
                  ))}
               </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                  <i className="fas fa-search text-4xl mb-3 opacity-50"></i>
                  <p>Không tìm thấy môn học nào.</p>
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklySchedule;