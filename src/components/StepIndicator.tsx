import React from 'react';
import { AppStep } from '../types';
import { FileTextIcon } from './icons/FileTextIcon';
import { ZapIcon } from './icons/ZapIcon';
import { CheckSquareIcon } from './icons/CheckSquareIcon';


interface StepIndicatorProps {
  currentStep: AppStep;
}

const stepsConfig = [
  { id: AppStep.UPLOAD, label: 'Subir Archivo', Icon: FileTextIcon },
  { id: AppStep.PROCESSING, label: 'Procesando', Icon: ZapIcon },
  { id: AppStep.RESULTS, label: 'Resultados', Icon: CheckSquareIcon },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const currentIndex = stepsConfig.findIndex(step => step.id === currentStep);

  return (
    <nav aria-label="Progress" className="w-full max-w-2xl mb-4">
      <ol role="list" className="flex items-center justify-between space-x-2 sm:space-x-4">
        {stepsConfig.map((step, index) => (
          <li key={step.label} className="relative flex-1">
            {index < stepsConfig.length -1 && (
                 <div
                    className={`absolute inset-0 top-1/2 -translate-y-1/2 h-0.5 w-full ${index < currentIndex ? 'bg-sky-500' : 'bg-slate-700'}`}
                    aria-hidden="true"
                    style={{left: 'calc(50% + 1rem)', right: 'calc(-50% + 1rem)'}}
                />
            )}
            <div
              className={`relative flex flex-col items-center p-2 rounded-md transition-all duration-300 ease-in-out ${index <= currentIndex ? 'opacity-100' : 'opacity-50'}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                  index < currentIndex ? 'bg-sky-500 border-sky-500' :
                  index === currentIndex ? 'border-sky-500 animate-pulse bg-sky-600/30' :
                  'border-slate-600 bg-slate-700'
                }`}
              >
                <step.Icon className={`h-5 w-5 ${index <= currentIndex ? 'text-white' : 'text-slate-400'}`} />
              </span>
              <span className={`mt-2 text-xs font-medium ${index <= currentIndex ? 'text-sky-300' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
};
export default StepIndicator;