import React, { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { IPFView } from './IPFView';
import type { Destination } from '../../types';
import { useNavigate } from 'react-router-dom';

interface IPFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStopToTrip?: (destination: Destination) => void;
}

export const IPFModal: React.FC<IPFModalProps> = ({
  isOpen,
  onClose,
  onAddStopToTrip,
}) => {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Modal Dialog Card */}
      <div 
        className="w-full max-w-5xl h-[92vh] bg-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Control Bar */}
        <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
          {/* Full Page View Button */}
          <button
            onClick={() => {
              onClose();
              navigate('/ipf');
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Open Dedicated Full Page View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Close Modal Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/50 transition"
            title="Close IPF"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <IPFView onAddStopToTrip={onAddStopToTrip} />
        </div>
      </div>
    </div>
  );
};
