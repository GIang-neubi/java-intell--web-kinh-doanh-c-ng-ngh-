import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="hg-theme-toggle"
      aria-label="Chuyển đổi chế độ sáng/tối"
    >
      <div className={`hg-theme-toggle-track ${theme}`}>
        <div className="hg-theme-toggle-thumb">
          {theme === 'light' ? (
            <Sun size={12} strokeWidth={2.5} color="#ea580c" />
          ) : (
            <Moon size={12} strokeWidth={2.5} color="#1d4ed8" />
          )}
        </div>
      </div>
      <style>{`
        .hg-theme-toggle {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          margin-left: 4px;
          margin-right: 4px;
        }
        .hg-theme-toggle-track {
          width: 48px;
          height: 26px;
          border-radius: 13px;
          position: relative;
          transition: background-color 0.3s;
          display: flex;
          align-items: center;
          padding: 3px;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .hg-theme-toggle-track.light {
          background-color: #f1f5f9;
          border: 1px solid #cbd5e1;
        }
        .hg-theme-toggle-track.dark {
          background-color: #1e293b;
          border: 1px solid #334155;
        }
        .hg-theme-toggle-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: white;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        }
        .hg-theme-toggle-track.dark .hg-theme-toggle-thumb {
          transform: translateX(20px);
          background-color: #0f172a;
        }
      `}</style>
    </button>
  );
}
