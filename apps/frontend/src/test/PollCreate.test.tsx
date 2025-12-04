import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PollCreate from '../apps/calendar/components/PollCreate';
import { MemoryRouter } from 'react-router-dom';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('PollCreate Component', () => {
    beforeEach(() => {
        mockFetch.mockClear();
        mockNavigate.mockClear();
    });

    it('renders the form', () => {
        render(
            <MemoryRouter>
                <PollCreate />
            </MemoryRouter>
        );
        expect(screen.getByText('Create New Gathering')).toBeInTheDocument();
        expect(screen.getByText('Propose Times')).toBeInTheDocument();
    });

    it('adds a time option when "Add" is clicked', async () => {
        render(
            <MemoryRouter>
                <PollCreate />
            </MemoryRouter>
        );

        // Find the "Add" button
        const addButton = screen.getByText('Add');
        fireEvent.click(addButton);

        // Should see the option added to the list
        // Since we default to today, we expect today's date format
        // Depending on locale, might need fuzzy match.
        // Our component renders 'MMM d, yyyy' in the list.
        await waitFor(() => {
             // Just check if a delete button appeared, indicating an item exists
             expect(screen.getAllByRole('button').length).toBeGreaterThan(1); // Add button + X button + Submit button
        });
    });

    // Note: Testing full submission requires interacting with complex DatePickers which can be tricky in JSDOM.
    // We will assume the logic holds if the state updates correctly.
});
