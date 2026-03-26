import React from 'react';

interface ImpulseWarningModalProps {
  isOpen: boolean;
  reasons: string[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImpulseWarningModal({ 
  isOpen, 
  reasons, 
  onConfirm, 
  onCancel 
}: ImpulseWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="text-center">
          <div className="text-5xl mb-4">⚡</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Heads up!
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This looks like an impulse buy. Still add it?
          </p>

          {reasons.length > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-6 text-left">
              <h4 className="font-medium text-orange-800 dark:text-orange-300 mb-2">
                Why we're flagging this:
              </h4>
              <ul className="space-y-1">
                {reasons.map((reason, index) => (
                  <li key={index} className="text-sm text-orange-700 dark:text-orange-400 flex items-start gap-2">
                    <span>•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Wait, let me think
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 transition-colors"
            >
              Yes, add it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
