import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const DURATIONS = [
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
    { label: 'Custom', value: -1 },
];

interface DurationSelectorProps {
    duration: number; // in minutes
    onChange: (minutes: number) => void;
    label?: string;
    showLabel?: boolean;
}

export const DurationSelector: React.FC<DurationSelectorProps> = ({
    duration,
    onChange,
    label = "Duration:",
    showLabel = true
}) => {
    // If current duration matches one of the presets, select it.
    // If not, it might be custom.
    const getSelectedValue = () => {
        const preset = DURATIONS.find(d => d.value === duration);
        return preset ? preset.value : -1;
    };

    const [selectedValue, setSelectedValue] = useState(getSelectedValue());
    const [customValue, setCustomValue] = useState(60);
    const [customUnit, setCustomUnit] = useState<'min' | 'hr'>('min');

    useEffect(() => {
        const newValue = getSelectedValue();

        // If we are currently in custom mode (-1), and the new duration matches the current custom value,
        // we should stay in custom mode (don't auto-switch to preset).
        if (selectedValue === -1) {
            const currentCustomMins = customUnit === 'hr' ? customValue * 60 : customValue;
            if (duration === currentCustomMins) {
                return;
            }
        }

        setSelectedValue(newValue);
    }, [duration, customValue, customUnit, selectedValue]);

    const handlePresetClick = (val: number) => {
        setSelectedValue(val);
        if (val !== -1) {
            onChange(val);
        } else {
            // If switching to custom, trigger with current custom values
            const min = customUnit === 'hr' ? customValue * 60 : customValue;
            onChange(min);
        }
    };

    const handleCustomChange = (val: number, unit: 'min' | 'hr') => {
        setCustomValue(val);
        setCustomUnit(unit);
        const min = unit === 'hr' ? val * 60 : val;
        onChange(min);
    };

    return (
        <div className="flex items-center gap-3">
            {showLabel && <span className="text-xs font-bold text-jade-600 uppercase">{label}</span>}
            <div className="flex bg-white rounded-lg border border-jade-200 p-1 gap-1">
                {DURATIONS.map(d => (
                    <button
                        key={d.label}
                        onClick={() => handlePresetClick(d.value)}
                        className={cn(
                            "px-3 py-1.5 text-xs rounded-md transition-all font-medium",
                            selectedValue === d.value
                                ? "bg-jade-500 text-white shadow-sm"
                                : "text-jade-600 hover:bg-jade-50"
                        )}
                    >
                        {d.label}
                    </button>
                ))}
            </div>

            {/* Custom Duration Input */}
            {selectedValue === -1 && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-jade-200 px-2 py-1 transform transition-all animate-in fade-in slide-in-from-left-2">
                    <input
                        type="number"
                        value={customValue}
                        onChange={(e) => handleCustomChange(Math.max(1, parseInt(e.target.value) || 1), customUnit)}
                        min={1}
                        className="w-16 px-2 py-1 text-xs rounded border border-jade-100 focus:outline-none focus:ring-1 focus:ring-jade-300"
                    />
                    <select
                        value={customUnit}
                        onChange={(e) => handleCustomChange(customValue, e.target.value as 'min' | 'hr')}
                        className="text-xs px-2 py-1 rounded border border-jade-100 bg-white focus:outline-none focus:ring-1 focus:ring-jade-300"
                    >
                        <option value="min">Minutes</option>
                        <option value="hr">Hours</option>
                    </select>
                </div>
            )}
        </div>
    );
};
