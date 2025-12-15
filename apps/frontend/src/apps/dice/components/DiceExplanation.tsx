import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, Star } from 'lucide-react';

export interface DiceExplanationProps {
  effectiveValid: boolean;
  effectiveMin: number;
  effectiveMax: number;
  N: number;
  k: number;
  Limit: number;
  rangeMin: number;
  diceValues: number[];
  rawValue: number | null;
  finalResult: number | null;
  rerolls: number;
}

export const DiceExplanation: React.FC<DiceExplanationProps> = ({
  effectiveValid,
  effectiveMin,
  effectiveMax,
  k,
  diceValues,
  finalResult,
  rerolls,
}) => {
  return (
    <div className="border border-arcane-200 bg-gradient-to-br from-white/60 to-arcane-50/40 backdrop-blur-sm rounded-xl p-5 shadow-sm">
      <h2 className="font-serif text-lg text-ink flex items-center gap-2">
        <Star size={16} className="text-gold-500" />
        The Oracle's Secret
      </h2>
      <div className="mt-3 text-sm text-ink/80 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-arcane-400 mt-0.5">✦</span>
          <span>
            Each cast summons ancient icosahedral artifacts—perfectly balanced to ensure fair divination.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-arcane-400 mt-0.5">✦</span>
          <span>
            The oracle reveals a number within{' '}
            <span className="font-medium text-arcane-700">
              {effectiveValid ? `${effectiveMin} to ${effectiveMax}` : 'your chosen bounds'}
            </span>
            , each possibility equally likely.
          </span>
        </div>
        {k > 1 && (
          <div className="flex items-start gap-2">
            <span className="text-arcane-400 mt-0.5">✦</span>
            <span>
              Your vast realm requires <span className="font-medium text-arcane-700">{k} sacred dice</span> working in harmony.
            </span>
          </div>
        )}
      </div>

      <Disclosure defaultOpen={false}>
        {({ open }) => (
          <div className="mt-4">
            <Disclosure.Button className="w-full flex items-center justify-between rounded-lg border border-arcane-200 bg-white/50 px-3 py-2 text-sm text-arcane-700 hover:bg-arcane-50/50 transition-colors">
              <span className="font-medium">Reveal the Runes</span>
              <ChevronDown
                size={18}
                className={['transition-transform text-arcane-500', open ? 'rotate-180' : 'rotate-0'].join(' ')}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="mt-3 rounded-lg border border-arcane-200 bg-white/40 px-3 py-3">
              {!effectiveValid ? (
                <div className="text-sm text-arcane-600 italic">Set your bounds to see the runes...</div>
              ) : (
                <>
                  {diceValues.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-widest text-arcane-500 font-medium">Sacred Dice</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diceValues.map((v, i) => (
                          <span
                            key={`${i}-${v}`}
                            className="px-3 py-1.5 rounded-full bg-gradient-to-br from-arcane-50 to-arcane-100 border border-arcane-200 text-arcane-700 text-sm shadow-sm"
                          >
                            {k > 1 ? `${ordinal(i + 1)} rune: ` : 'Rune: '}
                            <span className="font-semibold text-arcane-800">{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {finalResult !== null && (
                    <div className="mt-3 p-2 rounded-lg bg-gradient-to-r from-gold-300/20 to-arcane-100/30 border border-gold-400/30">
                      <div className="text-xs text-arcane-600">The oracle proclaims:</div>
                      <div className="text-lg font-serif font-semibold bg-gradient-to-r from-gold-600 to-arcane-600 bg-clip-text text-transparent">
                        {finalResult}
                      </div>
                    </div>
                  )}

                  {rerolls > 0 && (
                    <div className="mt-3 text-xs text-arcane-500 italic">
                      The fates required {rerolls} {rerolls === 1 ? 'recasting' : 'recastings'} for perfect balance.
                    </div>
                  )}
                </>
              )}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
