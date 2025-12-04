import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PollDetail from '../apps/calendar/components/PollDetail';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PollDetail Component', () => {
    beforeEach(() => {
        mockFetch.mockClear();
    });

    it('renders poll details and options', async () => {
        const mockPoll = {
            id: 1,
            title: 'Detail Poll',
            description: 'Detail Desc',
            creator: { id: 1, username: 'creator', display_name: 'Creator' },
            created_at: new Date().toISOString(),
            options: [
                {
                    id: 101,
                    label: 'Option 1',
                    start_time: '2023-12-01T09:00:00Z',
                    end_time: '2023-12-01T10:00:00Z',
                    votes: []
                }
            ]
        };

        // Mock User Fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ id: 2, username: 'viewer', display_name: 'Viewer' }),
        });

        // Mock Poll Fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockPoll,
        });

        render(
            <MemoryRouter initialEntries={['/1']}>
                <Routes>
                    <Route path="/:pollId" element={<PollDetail />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Detail Poll')).toBeInTheDocument();
        });
        expect(screen.getByText('Detail Desc')).toBeInTheDocument();
        expect(screen.getByText('Organized by Creator')).toBeInTheDocument();
        // Check for date/time rendering (simplified check)
        expect(screen.getByText('Dec')).toBeInTheDocument();
    });
});
