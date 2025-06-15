
import React from 'react';
import { TargetIcon } from './icons/TargetIcon'; // A generic icon representing classification/focus

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-lg">
      <div className="container mx-auto px-4 py-5 flex items-center">
        <TargetIcon className="h-10 w-10 text-sky-400 mr-3" />
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
          Clasificador de Delegación <span className="text-sky-400">IA</span>
        </h1>
      </div>
    </header>
  );
};