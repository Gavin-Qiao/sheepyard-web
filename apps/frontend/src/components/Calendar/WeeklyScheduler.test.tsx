import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeeklyScheduler from './WeeklyScheduler';

describe('WeeklyScheduler', () => {
    it('should not submit the form when clicking "Next Week" button', () => {
        const handleSubmit = vi.fn((e) => e.preventDefault());
        const handleDateChange = vi.fn();
        const currentDate = new Date('2024-01-01');

        render(
            <form onSubmit={handleSubmit}>
                <WeeklyScheduler
                    events={[]}
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                />
            </form>
        );

        // Find the "Next Week" button (chevron right)
        // Since we don't have aria-labels yet, we might need to rely on the class or structure, 
        // but adding aria-label would be better practice. For now, let's target the button element.
        // There are two buttons in the toolbar: Prev and Next.
        const buttons = screen.getAllByRole('button');
        // Assuming first is Prev, second is Next based on code order
        const nextButton = buttons[1];

        fireEvent.click(nextButton);

        // Expect onDateChange to be called
        expect(handleDateChange).toHaveBeenCalled();

        // Expect form submit to NOT be called
        expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('should not submit the form when clicking "Prev Week" button', () => {
        const handleSubmit = vi.fn((e) => e.preventDefault());
        const handleDateChange = vi.fn();
        const currentDate = new Date('2024-01-01');

        render(
            <form onSubmit={handleSubmit}>
                <WeeklyScheduler
                    events={[]}
                    currentDate={currentDate}
                    onDateChange={handleDateChange}
                />
            </form>
        );

        const buttons = screen.getAllByRole('button');
        const prevButton = buttons[0];

        fireEvent.click(prevButton);

        expect(handleDateChange).toHaveBeenCalled();
        expect(handleSubmit).not.toHaveBeenCalled();
    });
});
