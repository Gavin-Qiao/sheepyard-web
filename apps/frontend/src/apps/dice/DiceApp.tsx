import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Dices } from 'lucide-react';
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
        error: 'Enter integers for both Start and End.',
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
        error: 'No integers remain in the effective range. Adjust the numbers or include boundaries.',
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
        <header className="border-b border-jade-100 bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to={backDestination} className="text-jade-600 hover:text-jade-800 transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <div className="h-6 w-px bg-jade-200"></div>
              <div className="flex items-center space-x-2 text-jade-800">
                <Dices size={20} />
                <span className="font-serif text-lg tracking-wide font-bold">D20 Randomizer</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-light font-serif text-ink">D20 Randomizer</h1>
              <p className="text-jade-700 text-sm mt-1">Uniform integer in your chosen range.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Visual + Result */}
              <section className="lg:col-span-7">
                <div className="border border-jade-200 bg-white/40 backdrop-blur-sm rounded-xl p-5">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-jade-600">Range</div>
                    <div className="text-lg text-ink font-serif">
                      {formatEffectiveRange(effective.min, effective.max, effective.valid)}
                    </div>
                    <div className="text-xs text-jade-600 mt-1">
                      N={params.N || '—'} · d20×{params.k}
                      {revealedOutcome && !animating ? ` · rerolls ${revealedOutcome.rerolls}` : ''}
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl border border-jade-200/70 bg-paper/30 h-[320px] flex items-center justify-center">
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
                    <div className="text-xs uppercase tracking-widest text-jade-600">Result</div>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <div className="min-h-[56px]">
                        <AnimatePresence mode="popLayout">
                          {revealedOutcome?.finalResult !== null && revealedOutcome?.finalResult !== undefined && !animating && (
                            <motion.div
                              key={`result-${revealedOutcome.finalResult}-${animating ? 'r' : 's'}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.25 }}
                              className="text-5xl font-serif text-ink leading-none"
                            >
                              {revealedOutcome.finalResult}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {revealedOutcome === null && !animating && (
                          <div className="text-jade-600 text-sm mt-2">Press Roll.</div>
                        )}
                        {animating && (
                          <div className="text-jade-600 text-sm mt-2">Rolling…</div>
                        )}
                      </div>

                      <motion.button
                        type="button"
                        onClick={onRoll}
                        whileTap={{ scale: canRoll && !animating ? 0.98 : 1 }}
                        className={[
                          'px-5 py-3 rounded-lg font-sans text-sm tracking-wide transition-colors',
                          canRoll && !animating
                            ? 'bg-jade-400 text-paper hover:bg-jade-500'
                            : 'bg-jade-100 text-jade-400 cursor-not-allowed',
                        ].join(' ')}
                        disabled={!canRoll || animating}
                      >
                        {animating ? 'Rolling…' : 'Roll'}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Controls */}
              <aside className="lg:col-span-5">
                <div className="border border-jade-200 bg-white/40 backdrop-blur-sm rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-lg text-ink">Range</h2>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="block">
                      <div className="text-xs uppercase tracking-widest text-jade-600">Start</div>
                      <input
                        className="mt-2 w-full rounded-lg border border-jade-200 bg-white/60 px-3 py-2 text-ink placeholder:text-jade-400 focus:outline-none focus:ring-2 focus:ring-jade-200"
                        inputMode="numeric"
                        value={n0Text}
                        onChange={(e) => setN0Text(e.target.value)}
                        placeholder="e.g. 1"
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs uppercase tracking-widest text-jade-600">End</div>
                      <input
                        className="mt-2 w-full rounded-lg border border-jade-200 bg-white/60 px-3 py-2 text-ink placeholder:text-jade-400 focus:outline-none focus:ring-2 focus:ring-jade-200"
                        inputMode="numeric"
                        value={n1Text}
                        onChange={(e) => setN1Text(e.target.value)}
                        placeholder="e.g. 20"
                      />
                    </label>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-jade-200 bg-white/40 px-3 py-2">
                      <div>
                        <div className="text-sm text-ink">Include start</div>
                        <div className="text-xs text-jade-600">Off ⇒ min = Start + 1</div>
                      </div>
                      <Switch
                        checked={includeStart}
                        onChange={setIncludeStart}
                        className={[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-jade-200',
                          includeStart ? 'bg-jade-400' : 'bg-jade-200',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block h-5 w-5 transform rounded-full bg-paper transition-transform',
                            includeStart ? 'translate-x-5' : 'translate-x-1',
                          ].join(' ')}
                        />
                      </Switch>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-jade-200 bg-white/40 px-3 py-2">
                      <div>
                        <div className="text-sm text-ink">Include end</div>
                        <div className="text-xs text-jade-600">Off ⇒ max = End − 1</div>
                      </div>
                      <Switch
                        checked={includeEnd}
                        onChange={setIncludeEnd}
                        className={[
                          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-jade-200',
                          includeEnd ? 'bg-jade-400' : 'bg-jade-200',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'inline-block h-5 w-5 transform rounded-full bg-paper transition-transform',
                            includeEnd ? 'translate-x-5' : 'translate-x-1',
                          ].join(' ')}
                        />
                      </Switch>
                    </div>
                  </div>

                  <div className="mt-5">
                    {!effective.valid && (
                      <div className="rounded-lg border border-jade-200 bg-paper/60 px-3 py-2 text-sm text-jade-700">
                        {effective.error}
                      </div>
                    )}
                    {effective.valid && params.k > 6 && (
                      <div className="rounded-lg border border-jade-200 bg-paper/60 px-3 py-2 text-sm text-jade-700">
                        This is a very large range (needs {params.k} d20s). Rolling may take longer.
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


