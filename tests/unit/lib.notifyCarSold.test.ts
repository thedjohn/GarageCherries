import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom, mockListUsers, mockSend } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockListUsers: vi.fn(),
  mockSend: vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));

import { notifyWatchersCarSold } from '@/lib/notifyCarSold';

function makeAdmin() {
  return { from: mockFrom, auth: { admin: { listUsers: mockListUsers } } } as any;
}

function mockTables(opts: {
  watchers?: { user_id: string }[];
  users?: { id: string; email?: string; user_metadata?: { car_sold_opt_out?: boolean } }[];
  dealer?: { slug: string; name: string } | null;
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'watchlists') {
      return { select: () => ({ eq: () => Promise.resolve({ data: opts.watchers ?? [] }) }) };
    }
    if (table === 'dealers') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.dealer ?? null }) }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  mockListUsers.mockResolvedValue({ data: { users: opts.users ?? [] } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('notifyWatchersCarSold', () => {
  it('sends nothing when there are no watchers', async () => {
    mockTables({ watchers: [] });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockListUsers).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends nothing when watchers resolve to no real emails', async () => {
    mockTables({ watchers: [{ user_id: 'buyer-1' }], users: [{ id: 'buyer-1', email: undefined }] });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('includes a review link when the dealer is found', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }],
      users: [{ id: 'buyer-1', email: 'buyer@x.com' }],
      dealer: { slug: 'survivor-classic', name: 'Survivor Classic Car Services' },
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).toHaveBeenCalledOnce();
    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain('Leave a Review');
    expect(html).toContain('/dealers/survivor-classic#reviews');
    expect(html).toContain('Survivor Classic Car Services');
  });

  it('still sends the sold notification, without a review link, when no dealer is found', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }],
      users: [{ id: 'buyer-1', email: 'buyer@x.com' }],
      dealer: null,
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).toHaveBeenCalledOnce();
    const html = mockSend.mock.calls[0][0].html;
    expect(html).not.toContain('Leave a Review');
    expect(html).toContain('Nice Car');
  });

  it('emails only the watchers that resolve to a real address, skipping the rest', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }, { user_id: 'buyer-2' }],
      users: [{ id: 'buyer-1', email: 'buyer1@x.com' }],
      dealer: { slug: 'some-dealer', name: 'Some Dealer' },
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('buyer1@x.com');
  });

  it('skips users who have opted out of car-sold notifications', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }, { user_id: 'buyer-2' }],
      users: [
        { id: 'buyer-1', email: 'optedout@x.com', user_metadata: { car_sold_opt_out: true } },
        { id: 'buyer-2', email: 'buyer2@x.com' },
      ],
      dealer: { slug: 'some-dealer', name: 'Some Dealer' },
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('buyer2@x.com');
  });

  it('sends nothing when every watcher has opted out', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }],
      users: [{ id: 'buyer-1', email: 'optedout@x.com', user_metadata: { car_sold_opt_out: true } }],
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('includes an unsubscribe link scoped to the recipient\'s user id', async () => {
    mockTables({
      watchers: [{ user_id: 'buyer-1' }],
      users: [{ id: 'buyer-1', email: 'buyer1@x.com' }],
    });
    await notifyWatchersCarSold(makeAdmin(), 'car-1', 'Nice Car', 'dealer-1');
    const html = mockSend.mock.calls[0][0].html;
    expect(html).toContain('/unsubscribe/car-sold?uid=buyer-1');
  });
});
