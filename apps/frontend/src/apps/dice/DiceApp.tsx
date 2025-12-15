import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Switch } from '@headlessui/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Background } from '../../components/Background';
import { calculateDiceParams } from './utils/diceLogic';
import { RollOutcome, rollUntilValid } from './utils/roller';
import { DiceScene3D } from './components/DiceScene3D';
import { DiceExplanation } from './components/DiceExplanation';

function parseIntStrict(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

function formatEffectiveRange(min: number, max: number, valid: boolean): string {
  if (!valid) return '—';
  return `${min} … ${max}`;
}

const DiceApp: React.FC = () => {
  const location = useLocation();

  const [n0Text, setN0Text] = useState('1');
  const [n1Text, setN1Text] = useState('20');
  const [includeStart, setIncludeStart] = useState(true);
  const [includeEnd, setIncludeEnd] = useState(true);

  const [rollId, setRollId] = useState(0);
  const [diceValues, setDiceValues] = useState<number[]>([]);
  const [animating, setAnimating] = useState(false);
  const pendingOutcomeRef = useRef<RollOutcome | null>(null);
  const [revealedOutcome, setRevealedOutcome] = useState<RollOutcome | null>(null);
  const reducedMotion = useReducedMotion();

  const { parsedN0, parsedN1, hasValidInputs } = useMemo(() => {
    const p0 = parseIntStrict(n0Text);
    const p1 = parseIntStrict(n1Text);
    return { parsedN0: p0, parsedN1: p1, hasValidInputs: p0 !== null && p1 !== null };
  }, [n0Text, n1Text]);

  const effective = useMemo(() => {
    if (!hasValidInputs) {
      return {
        valid: false,
        min: 0,
        max: 0,
        error: 'Enter numbers for both bounds to reveal your destiny.',
      };
    }

    const n0 = parsedN0 as number;
    const n1 = parsedN1 as number;

    const min = includeStart ? n0 : n0 + 1;
    const max = includeEnd ? n1 : n1 - 1;

    if (min > max) {
      return {
        valid: false,
        min,
        max,
        error: 'No possibilities remain within these bounds. Adjust the numbers or include the boundaries.',
      };
    }

    return { valid: true, min, max, error: '' };
  }, [hasValidInputs, parsedN0, parsedN1, includeStart, includeEnd]);

  const params = useMemo(() => {
    if (!effective.valid) {
      return { N: 0, k: 1, Limit: 0, rangeMin: effective.min };
    }
    return calculateDiceParams(parsedN0 as number, parsedN1 as number, includeStart, includeEnd);
  }, [effective.valid, effective.min, parsedN0, parsedN1, includeStart, includeEnd]);

  const isRoot = location.pathname === '/apps/dice' || location.pathname === '/apps/dice/';
  const backDestination = isRoot ? '/' : '/apps/dice/';

  const canRoll = effective.valid && params.N > 0 && params.Limit > 0;

  const onRoll = () => {
    if (!canRoll || animating) return;

    const outcome = rollUntilValid(params);
    setDiceValues(outcome.diceValues);
    pendingOutcomeRef.current = outcome;
    setRevealedOutcome(null);
    setAnimating(true);
    setRollId((id) => id + 1);
  };

  return (
    <Background>
      <div className="flex h-screen w-full flex-col font-sans">
        <header className="border-b border-arcane-200 bg-gradient-to-r from-arcane-50 via-white/80 to-arcane-50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to={backDestination} className="text-arcane-600 hover:text-arcane-800 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="h-6 w-px bg-arcane-200"></div>
              <div className="flex items-center space-x-2 text-arcane-800">
                <Sparkles size={20} className="text-gold-500" />
                <span className="font-serif text-lg tracking-wide font-bold bg-gradient-to-r from-arcane-700 via-arcane-500 to-gold-600 bg-clip-text text-transparent">The Oracle's Die</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-light font-serif bg-gradient-to-r from-arcane-800 via-arcane-600 to-gold-600 bg-clip-text text-transparent">The Oracle's Die</h1>
              <p className="text-arcane-600 text-sm mt-1 italic">Let fate reveal your number</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Visual + Result */}
              <section className="lg:col-span-7">
                <div className="border border-arcane-200 bg-gradient-to-br from-white/60 to-arcane-50/40 backdrop-blur-sm rounded-xl p-5 shadow-sm">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-arcane-600 font-medium">Destiny's Bounds</div>
                    <div className="text-lg text-ink font-serif">
                      {formatEffectiveRange(effective.min, effective.max, effective.valid)}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-arcane-200/70 bg-gradient-to-b from-paper/50 to-arcane-50/30 h-[320px] flex items-center justify-center shadow-inner">
                    <DiceScene3D
                      diceCount={params.k}
                      diceValues={diceValues}
                      rollId={rollId}
                      reducedMotion={Boolean(reducedMotion)}
                      onRollComplete={() => {
                        setAnimating(false);
                        setRevealedOutcome(pendingOutcomeRef.current);
                      }}
                    />
                  </div>

                  <div className="mt-6">
                    <div className="text-xs uppercase tracking-widest text-arcane-600 font-medium">Your Fate</div>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div className="min-h-[56px]">
                        <AnimatePresence mode="popLayout">
                          {revealedOutcome?.finalResult !== null && revealedOutcome?.finalResult !== undefined && !animating && (
                            <motion.div
                              key={`result-${revealedOutcome.finalResult}-${animating ? 'r' : 's'}`}
                              initial={{ opacity: 0, y: 6, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -6, scale: 0.9 }}
                              transition={{ duration: 0.35, ease: 'easeOut' }}
                              className="text-5xl font-serif bg-gradient-to-br from-gold-500 via-gold-600 to-arcane-600 bg-clip-text text-transparent leading-none drop-shadow-sm"
                            >
                              {revealedOutcome.finalResult}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {revealedOutcome === null && !animating && (
                          <div className="text-arcane-500 text-sm mt-2 italic">Invoke the oracle...</div>
                        )}
                        {animating && (
                          <div className="text-arcane-500 text-sm mt-2 italic">The fates weave...</div>
                        )}
                      </div>

                      <motion.button
                        type="button"
                        onClick={onRoll}
                        whileTap={{ scale: canRoll && !animating ? 0.98 : 1 }}
                        whileHover={{ scale: canRoll && !animating ? 1.02 : 1 }}
                        className={[
                          'px-6 py-3 rounded-lg font-sans text-sm tracking-wide transition-all duration-300 shadow-md',
                          canRoll && !animating
                            ? 'bg-gradient-to-r from-arcane-600 via-arcane-500 to-arcane-600 text-white hover:from-arcane-500 hover:via-arcane-400 hover:to-arcane-500 hover:shadow-lg hover:shadow-arcane-300/30'
                            : 'bg-arcane-100 text-arcane-400 cursor-not-allowed',
                        ].join(' ')}
                        disabled={!canRoll || animating}
                      >
                        {animating ? (
                          <span className="flex items-center gap-2">
                            <Sparkles size={14} className="animate-pulse" />
                            Divining...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <Sparkles size={14} />
                            Cast the Die
                          </span>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Controls */}
              <aside className="lg:col-span-5">
                <div className="border border-arcane-200 bg-gradient-to-br from-white/60 to-arcane-50/40 backdrop-blur-sm rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-lg text-ink">Destiny's Bounds</h2>
                      <p className="text-arcane-500 text-xs mt-0.5">Define the realm of possibilities</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <div className="text-xs uppercase tracking-widest text-arcane-600 font-medium">From</div>
                      <input
                        className="mt-2 w-full rounded-lg border border-arcane-200 bg-white/80 px-3 py-2 text-ink placeholder:text-arcane-400 focus:outline-none focus:ring-2 focus:ring-arcane-300 focus:border-arcane-400 transition-all"
                        inputMode="numeric"
                        value={n0Text}
                        onChange={(e) => setN0Text(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs uppercase tracking-widest text-arcane-600 font-medium">To</div>
                      <input
                        className="mt-2 w-full rounded-lg border border-arcane-200 bg-white/80 px-3 py-2 text-ink placeholder:text-arcane-400 focus:outline-none focus:ring-2 focus:ring-arcane-300 focus:border-arcane-400 transition-all"
                        inputMode="numeric"
                        value={n1Text}
                        onChange={(e) => setN1Text(e.target.value)}
                        placeholder="e.g. 20"
                      />
                    </label>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-arcane-200 bg-white/50 px-3 py-2">
                      <div>
                        <div className="text-sm text-ink">Include first number</div>
                        <div className="text-xs text-arcane-500">When off, starts from the next number</div>
                      </div>
                      <Switch
                        checked={includeStart}
                        onChange={setIncludeStart}
                        className={[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-arcane-300',
                          includeStart ? 'bg-arcane-500' : 'bg-arcane-200',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                            includeStart ? 'translate-x-5' : 'translate-x-1',
                          ].join(' ')}
                        />
                      </Switch>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-arcane-200 bg-white/50 px-3 py-2">
                      <div>
                        <div className="text-sm text-ink">Include last number</div>
                        <div className="text-xs text-arcane-500">When off, ends before this number</div>
                      </div>
                      <Switch
                        checked={includeEnd}
                        onChange={setIncludeEnd}
                        className={[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-arcane-300',
                          includeEnd ? 'bg-arcane-500' : 'bg-arcane-200',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                            includeEnd ? 'translate-x-5' : 'translate-x-1',
                          ].join(' ')}
                        />
                      </Switch>
                    </div>
                  </div>

                  <div className="mt-5">
                    {!effective.valid && (
                      <div className="rounded-lg border border-arcane-200 bg-arcane-50/60 px-3 py-2 text-sm text-arcane-700">
                        {effective.error}
                      </div>
                    )}
                    {effective.valid && params.k > 6 && (
                      <div className="rounded-lg border border-gold-400/50 bg-gold-300/20 px-3 py-2 text-sm text-gold-700">
                        A vast realm of possibilities. The oracle may take a moment longer to divine your fate.
                      </div>
                    )}
                  </div>

                </div>

                <div className="mt-6">
                  <DiceExplanation
                    effectiveValid={effective.valid}
                    effectiveMin={effective.min}
                    effectiveMax={effective.max}
                    N={params.N}
                    k={params.k}
                    Limit={params.Limit}
                    rangeMin={params.rangeMin}
                    diceValues={revealedOutcome?.diceValues ?? []}
                    rawValue={revealedOutcome?.rawValue ?? null}
                    finalResult={revealedOutcome?.finalResult ?? null}
                    rerolls={revealedOutcome?.rerolls ?? 0}
                  />
                </div>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </Background>
  );
};

export default DiceApp;
