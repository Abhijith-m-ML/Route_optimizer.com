import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  ArrowUpDown, 
  Sparkles, 
  Share2, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2,
  Compass
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface StepInfo {
  step: number;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  tip: string;
}

const ONBOARDING_STEPS: StepInfo[] = [
  {
    step: 1,
    title: 'Search for Any Destination',
    subtitle: 'Find places across India',
    description: 'Type place names, landmarks, or street addresses into the search bar, or tap "Add Current Location" to begin directly from your device GPS coordinates.',
    badge: 'Step 1 of 5',
    icon: Search,
    iconBg: 'bg-cyan-500/10 border-cyan-500/30',
    iconColor: 'text-cyan-400',
    tip: 'Tip: You can prioritize search results by state or explore nationwide.',
  },
  {
    step: 2,
    title: 'Add Multiple Destinations',
    subtitle: 'Build your custom itinerary',
    description: 'Add as many stops as you need for day trips, weekend getaways, or multi-city cross-state tours. Vazhikatti organizes your saved places automatically.',
    badge: 'Step 2 of 5',
    icon: MapPin,
    iconBg: 'bg-indigo-500/10 border-indigo-500/30',
    iconColor: 'text-indigo-400',
    tip: 'Tip: Saved stops automatically group by state for clear organization.',
  },
  {
    step: 3,
    title: 'Arrange & Schedule Stops',
    subtitle: 'Tailor your travel timeline',
    description: 'Reorder destinations with one-touch move buttons and choose visit durations (30 min to 3 hours) for each stop to get accurate travel schedules.',
    badge: 'Step 3 of 5',
    icon: ArrowUpDown,
    iconBg: 'bg-blue-500/10 border-blue-500/30',
    iconColor: 'text-blue-400',
    tip: 'Tip: Accurate visit durations help estimate your exact return time.',
  },
  {
    step: 4,
    title: 'Optimize Your Route in 1 Click',
    subtitle: 'Save travel distance and time',
    description: 'Tap "Optimize Route" to solve the Traveling Salesperson Problem (TSP). Vazhikatti reorders your stops into the most efficient sequence to minimize back-tracking.',
    badge: 'Step 4 of 5',
    icon: Sparkles,
    iconBg: 'bg-purple-500/10 border-purple-500/30',
    iconColor: 'text-purple-400',
    tip: 'Tip: Optimization accounts for live road distances between stops.',
  },
  {
    step: 5,
    title: 'Share & Import Itineraries',
    subtitle: 'Collaborate with friends and family',
    description: 'Generate clean share links filtered by state. Co-travelers can preview destinations and non-destructively import them directly into their own map.',
    badge: 'Step 5 of 5',
    icon: Share2,
    iconBg: 'bg-emerald-500/10 border-emerald-500/30',
    iconColor: 'text-emerald-400',
    tip: 'Tip: Recipients can import shared stops without overwriting their own map.',
  },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  if (!isOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const IconComponent = currentStep.icon;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 sm:p-7 text-slate-100 flex flex-col max-h-[92dvh] overflow-y-auto my-auto animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-step-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 flex items-center justify-center shadow-sm">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Welcome to Vazhikatti
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
              title="Skip tutorial"
              aria-label="Skip onboarding"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Visual & Card */}
        <div className="py-6 flex flex-col items-center text-center">
          {/* Step Icon Badge */}
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl ${currentStep.iconBg} border flex items-center justify-center mb-4 shadow-xl transition-all duration-300`}>
            <IconComponent className={`w-8 h-8 sm:w-10 sm:h-10 ${currentStep.iconColor}`} />
          </div>

          <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">
            {currentStep.badge}
          </span>

          <h3 
            id="onboarding-step-title"
            className="text-lg sm:text-2xl font-extrabold text-white tracking-tight mb-2"
          >
            {currentStep.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mb-4">
            {currentStep.description}
          </p>

          {/* Pro-Tip Box */}
          <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-left flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              {currentStep.tip}
            </p>
          </div>
        </div>

        {/* Footer Navigation & Progress Dots */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5" aria-label={`Step ${currentStepIndex + 1} of ${ONBOARDING_STEPS.length}`}>
            {ONBOARDING_STEPS.map((s, idx) => (
              <button
                key={s.step}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-gradient-to-r from-indigo-500 to-cyan-400'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Go to step ${s.step}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition min-h-[40px]"
                aria-label="Previous step"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.98] shadow-lg shadow-indigo-600/30 transition min-h-[40px]"
              aria-label={isLastStep ? 'Get started with Vazhikatti' : 'Next step'}
            >
              <span>{isLastStep ? 'Get Started' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
