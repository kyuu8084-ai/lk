import React, { useState } from 'react';
import { User } from '../types';
import { audioService } from '../services/audioService';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      audioService.playError();
      return;
    }

    const savedUsers = JSON.parse(localStorage.getItem('studyWithMeUsers') || '{}');

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        audioService.playError();
        return;
      }
      if (savedUsers[username]) {
        setError('Tên đăng nhập đã tồn tại');
        audioService.playError();
        return;
      }

      const newUser: User = { username, password, schedules: [] };
      savedUsers[username] = newUser;
      localStorage.setItem('studyWithMeUsers', JSON.stringify(savedUsers));
      
      audioService.playLoginSuccess();
      onLogin(newUser);
    } else {
      const user = savedUsers[username];
      if (user && user.password === password) {
        audioService.playLoginSuccess();
        onLogin(user);
      } else {
        setError('Sai tên đăng nhập hoặc mật khẩu');
        audioService.playError();
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="glass-panel rounded-[2.5rem] shadow-glass p-8 md:p-12 w-full max-w-md transform transition-all hover:scale-[1.01]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent mb-6 shadow-lg shadow-primary/30 text-white">
            <i className="fas fa-graduation-cap text-4xl"></i>
          </div>
          <h1 className="text-4xl font-serif font-black text-slate-800 dark:text-white mb-2 tracking-tight">StudyWithMe</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Hệ thống quản lý học tập thông minh</p>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur text-red-600 p-4 rounded-2xl mb-6 text-sm text-center font-bold border border-red-200 animate-pulse">
            <i className="fas fa-exclamation-circle mr-1"></i> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Tên đăng nhập</label>
            <div className="relative">
              <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all dark:text-white font-medium"
                placeholder="Nhập tên của bạn"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Mật khẩu</label>
            <div className="relative">
              <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all dark:text-white font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-2 animate-fadeIn">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Xác nhận mật khẩu</label>
              <div className="relative">
                <i className="fas fa-check-circle absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all dark:text-white font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transform hover:-translate-y-1 transition-all duration-300 text-lg mt-4"
          >
            {isRegistering ? 'Đăng Ký Tài Khoản' : 'Bắt Đầu Học Tập'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-primary font-bold ml-2 hover:underline focus:outline-none"
            >
              {isRegistering ? 'Đăng nhập' : 'Đăng ký ngay'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;