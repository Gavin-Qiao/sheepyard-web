import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PollList from '../apps/calendar/components/PollList';
import { MemoryRouter } from 'react-router-dom';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('PollList Component', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('renders loading state initially', () => {
        // Return a promise that never resolves immediately to test loading state if needed,
        // but typically we just check if it renders.
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <MemoryRouter>
                <PollList />
            </MemoryRouter>
        );
        // We might not catch the loading spinner if the promise resolves too fast in JSDOM,
        // but we can check if it attempts to fetch.
        expect(mockFetch).toHaveBeenCalledWith('/api/polls');
    });

    it('renders polls when fetch succeeds', async () => {
        const mockPolls = [
            {
                id: 1,
                title: 'Test Poll',
                description: 'Test Desc',
                created_at: new Date().toISOString(),
                is_active: true,
                options: []
            }
        ];

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockPolls,
        });

        render(
            <MemoryRouter>
                <PollList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Test Poll')).toBeInTheDocument();
        });
        expect(screen.getByText('Test Desc')).toBeInTheDocument();
    });

    it('renders empty state when no polls', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => [],
        });

        render(
            <MemoryRouter>
                <PollList />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('No gatherings planned yet.')).toBeInTheDocument();
        });
    });
});
