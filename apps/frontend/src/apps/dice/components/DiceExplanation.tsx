import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';

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
  N,
  k,
  Limit,
  rangeMin,
  diceValues,
  rawValue,
  finalResult,
  rerolls,
}) => {
  return (
    <div className="border border-jade-200 bg-white/40 backdrop-blur-sm rounded-xl p-5">
      <h2 className="font-serif text-lg text-ink">How it works</h2>
      <div className="mt-2 text-sm text-ink space-y-1.5">
        <div>
          <span className="font-medium">Result</span>: a uniform integer in{' '}
          <span className="font-mono text-jade-800">{effectiveValid ? `${effectiveMin}…${effectiveMax}` : 'your range'}</span>.
        </div>
        <div>
          <span className="font-medium">Dice</span>: each d20 settles showing the rolled number.
        </div>
        <div>
          <span className="font-medium">Rerolls</span>: only when needed for fairness.
        </div>
      </div>

      <Disclosure defaultOpen={false}>
        {({ open }) => (
          <div className="mt-4">
            <Disclosure.Button className="w-full flex items-center justify-between rounded-lg border border-jade-200 bg-paper/50 px-3 py-2 text-sm text-jade-800 hover:bg-paper/70 transition-colors">
              <span className="font-medium">Details</span>
              <ChevronDown
                size={18}
                className={['transition-transform', open ? 'rotate-180' : 'rotate-0'].join(' ')}
              />
            </Disclosure.Button>
            <Disclosure.Panel className="mt-3 rounded-lg border border-jade-200 bg-white/40 px-3 py-3">
              {!effectiveValid ? (
                <div className="text-sm text-jade-700">Set a valid range to see details.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm text-ink">
                    <div className="rounded-md bg-paper/60 px-2 py-1">
                      <div className="text-xs text-jade-600">Range</div>
                      <div className="font-mono">{effectiveMin}…{effectiveMax}</div>
                    </div>
                    <div className="rounded-md bg-paper/60 px-2 py-1">
                      <div className="text-xs text-jade-600">N</div>
                      <div className="font-mono">{N}</div>
                    </div>
                    <div className="rounded-md bg-paper/60 px-2 py-1">
                      <div className="text-xs text-jade-600">d20</div>
                      <div className="font-mono">×{k}</div>
                    </div>
                    <div className="rounded-md bg-paper/60 px-2 py-1">
                      <div className="text-xs text-jade-600">Rerolls</div>
                      <div className="font-mono">{rerolls}</div>
                    </div>
                  </div>

                  {diceValues.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-widest text-jade-600">Dice</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diceValues.map((v, i) => (
                          <span
                            key={`${i}-${v}`}
                            className="px-2.5 py-1 rounded-full bg-white/60 border border-jade-200 text-ink text-sm"
                          >
                            #{i + 1}: <span className="font-medium">{v}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 text-xs text-jade-700">
                    {rawValue !== null ? (
                      <span className="font-mono">R = {rawValue}</span>
                    ) : (
                      <span className="font-mono">R = …</span>
                    )}
                    {' '}·{' '}
                    <span className="font-mono">Limit = {Limit}</span>
                    {' '}·{' '}
                    <span className="font-mono">final = {rangeMin} + (R mod {N})</span>
                    {finalResult !== null ? <span className="font-mono"> = {finalResult}</span> : null}
                  </div>
                </>
              )}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    </div>
  );
};


