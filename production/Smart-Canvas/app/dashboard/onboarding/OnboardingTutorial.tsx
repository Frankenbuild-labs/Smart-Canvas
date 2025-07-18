import React, { useState, useEffect, useRef } from 'react';

interface OnboardingStep {
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tutorialSteps: OnboardingStep[] = [
  {
    target: '[data-tutorial="node-library"]',
    title: 'Node Library',
    content: 'This is where youll find all the building blocks for your AI workflow. Try dragging a node onto the canvas!',
    position: 'right',
  },
  {
    target: '[data-tutorial="node-library"]',
    title: 'Start with Input',
    content: 'Drag an Input Node to start your workflow. This is where user queries begin.',
    position: 'right',
  },
  {
    target: '[data-tutorial="node-library"]',
    title: 'Add AI Processing',
    content: 'Connect an LLM Node to process your input with AI language models.',
    position: 'right',
  },
  {
    target: '[data-tutorial="node-library"]',
    title: 'Build Your Flow',
    content: 'Connect nodes by dragging from one node s handle to another. Create your AI workflow visually!',
    position: 'bottom',
  },
  {
    target: '[data-tutorial="node-library"]',
    title: 'Run Your Agent',
    content: 'Once your flow is ready, click here to run your AI agent!',
    position: 'top',
  },
];

interface TooltipProps {
  step: OnboardingStep;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  currentStep: number;
  totalSteps: number;
}

const Tooltip: React.FC<TooltipProps> = ({ step, onNext, onPrevious, onSkip, currentStep, totalSteps }) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - 120;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'bottom':
          top = rect.bottom + 20;
          left = rect.left + rect.width / 2 - 150;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - 60;
          left = rect.left - 320;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - 60;
          left = rect.right + 20;
          break;
      }

      setPosition({ top, left });
    }
  }, [step]);

  return (
    <div
      className="fixed z-50 w-80 p-4 rounded-xl shadow-xl bg-white border border-zinc-200"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <h3 className="text-lg font-semibold text-zinc-900 mb-2">{step.title}</h3>
      <p className="text-sm text-zinc-600 mb-4">{step.content}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            disabled={currentStep === 0}
            className="px-3 py-1.5 text-sm rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            className="px-3 py-1.5 text-sm rounded bg-primary text-white hover:bg-primary/90"
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
        <button
          onClick={onSkip}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

interface OnboardingTutorialProps {
  onComplete: () => void;
}

export default function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);

  // Track the last highlighted element
  const lastHighlightRef = useRef<Element | null>(null);

  useEffect(() => {
    let stepIndex = currentStep;
    let currentElement = document.querySelector(tutorialSteps[stepIndex].target);
    // Skip steps with missing targets
    while (!currentElement && stepIndex < tutorialSteps.length - 1) {
      stepIndex++;
      currentElement = document.querySelector(tutorialSteps[stepIndex].target);
    }
    if (stepIndex !== currentStep) {
      setCurrentStep(stepIndex);
      return;
    }
    if (currentElement) {
      currentElement.classList.add('tutorial-highlight');
      lastHighlightRef.current = currentElement;
      return () => {
        currentElement.classList.remove('tutorial-highlight');
      };
    }
    return () => {};
  }, [currentStep]);

  const removeHighlight = () => {
    if (lastHighlightRef.current) {
      lastHighlightRef.current.classList.remove('tutorial-highlight');
      lastHighlightRef.current = null;
    }
  };

  const finishTutorial = () => {
    removeHighlight();
    setIsOverlayVisible(false);
    setIsVisible(false);
    onComplete();
  };

  const handleNext = () => {
    if (currentStep === tutorialSteps.length - 1) {
      finishTutorial();
    } else {
      let nextStep = currentStep + 1;
      while (nextStep < tutorialSteps.length && !document.querySelector(tutorialSteps[nextStep].target)) {
        nextStep++;
      }
      if (nextStep < tutorialSteps.length) {
        setCurrentStep(nextStep);
      } else {
        finishTutorial();
      }
    }
  };

  const handlePrevious = () => {
    setCurrentStep(c => Math.max(0, c - 1));
  };

  const handleSkip = () => {
    finishTutorial();
  };

  if (!isVisible) return null;

  return (
    <>
      {isOverlayVisible && (
        <div 
          className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOverlayVisible ? 'opacity-100' : 'opacity-0'}`} 
        />
      )}
      <style jsx global>{`
        .tutorial-highlight {
          position: relative;
          z-index: 45 !important;
          outline: 3px solid #111 !important;
          box-shadow: 0 0 0 6px rgba(0,0,0,0.18) !important;
          transition: outline 0.2s, box-shadow 0.2s;
        }
      `}</style>
      <Tooltip
        step={tutorialSteps[currentStep]}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
        currentStep={currentStep}
        totalSteps={tutorialSteps.length}
      />
    </>
  );
} 