import React from 'react';

interface FarewellScreenProps {
  name: string;
  text: string;
  buttonLabel: string;
  onContinue: () => void;
}

export const FarewellScreen: React.FC<FarewellScreenProps> = ({ name, text, buttonLabel, onContinue }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas p-4 text-right">
    <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8 text-center shadow-sm">
      <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-success-soft text-success font-bold text-2xl mb-4 border border-success/20">
        ✓
      </div>
      <h2 className="text-xl font-bold text-ink">
        {name ? `${name} عزیز، ` : ''}سپاس از درنگ هوشیارانه امروز شما
      </h2>
      <p className="mt-2 text-sm text-ink-2 leading-relaxed">{text}</p>
      <div className="mt-6 flex flex-col gap-2">
        <button
          onClick={onContinue}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-surface shadow-sm hover:bg-primary-hover transition-all"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  </div>
);
