
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 shadow-top mt-auto">
      <div className="container mx-auto px-4 py-6 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} Clasificador de Delegación IA. Todos los derechos reservados.</p>
        <p className="mt-1">Desarrollado por Carrizo Jorge.</p>
      </div>
    </footer>
  );
};