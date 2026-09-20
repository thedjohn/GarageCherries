import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUserByEmail } from '@/lib/findUserByEmail';

const mockRpc = vi.fn();
const mockGetUserById = vi.fn();
const admin = { rpc: mockRpc, auth: { admin: { getUserById: mockGetUserById } } } as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('findUserByEmail', () => {
  it('looks the id up by lowercased, trimmed email, then loads the user', async () => {
    mockRpc.mockResolvedValue({ data: 'u1', error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { id: 'u1', email: 'person@x.com' } }, error: null });

    const { user, error } = await findUserByEmail(admin, '  Person@X.com ');

    expect(mockRpc).toHaveBeenCalledWith('find_user_id_by_email', { p_email: 'person@x.com' });
    expect(mockGetUserById).toHaveBeenCalledWith('u1');
    expect(user?.id).toBe('u1');
    expect(error).toBeNull();
  });

  it('returns null without loading anyone when no account has that email', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { user, error } = await findUserByEmail(admin, 'nobody@x.com');
    expect(user).toBeNull();
    expect(error).toBeNull();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('returns the error message when the database function fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
    const { user, error } = await findUserByEmail(admin, 'a@x.com');
    expect(user).toBeNull();
    expect(error).toBe('function does not exist');
  });

  it('returns the error message when loading the user by id fails', async () => {
    mockRpc.mockResolvedValue({ data: 'u1', error: null });
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: { message: 'db down' } });
    const { user, error } = await findUserByEmail(admin, 'a@x.com');
    expect(user).toBeNull();
    expect(error).toBe('db down');
  });
});
