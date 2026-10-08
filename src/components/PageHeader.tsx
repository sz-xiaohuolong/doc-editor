import React, { useState, useEffect } from "react";

interface PageHeaderProps {
  title: string;
  onRename: (newTitle: string) => void;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, onRename }) => {
  const [currentTitle, setCurrentTitle] = useState(title);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const handleBlur = () => {
    const trimmed = currentTitle.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    } else {
      setCurrentTitle(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-6 pt-10 pb-2">
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="新页面"
        className="w-full text-3xl font-bold text-slate-800 placeholder-slate-300 bg-transparent border-none outline-none tracking-tight focus:ring-0 px-0 transition-colors"
      />
    </div>
  );
};
