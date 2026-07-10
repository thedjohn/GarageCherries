import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MessengerProvider, useMessenger } from '@/lib/messenger-context';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MessengerProvider>{children}</MessengerProvider>;
}

describe('useMessenger', () => {
  it('throws when used outside a MessengerProvider', () => {
    expect(() => renderHook(() => useMessenger())).toThrow('useMessenger must be used within MessengerProvider');
  });

  it('starts closed with no conversation', () => {
    const { result } = renderHook(() => useMessenger(), { wrapper });
    expect(result.current.open).toBe(false);
    expect(result.current.minimized).toBe(false);
    expect(result.current.conversationId).toBeNull();
    expect(result.current.listingTitle).toBe('');
  });

  it('openChat opens the widget with the given conversation, un-minimized', () => {
    const { result } = renderHook(() => useMessenger(), { wrapper });
    act(() => result.current.openChat('conv-1', 'Nice Car'));
    expect(result.current.open).toBe(true);
    expect(result.current.minimized).toBe(false);
    expect(result.current.conversationId).toBe('conv-1');
    expect(result.current.listingTitle).toBe('Nice Car');
  });

  it('openChat un-minimizes if the widget was previously minimized', () => {
    const { result } = renderHook(() => useMessenger(), { wrapper });
    act(() => result.current.openChat('conv-1', 'Nice Car'));
    act(() => result.current.toggleMinimize());
    expect(result.current.minimized).toBe(true);
    act(() => result.current.openChat('conv-2', 'Another Car'));
    expect(result.current.minimized).toBe(false);
    expect(result.current.conversationId).toBe('conv-2');
  });

  it('closeChat closes the widget and clears the conversation, preserving minimized state', () => {
    const { result } = renderHook(() => useMessenger(), { wrapper });
    act(() => result.current.openChat('conv-1', 'Nice Car'));
    act(() => result.current.closeChat());
    expect(result.current.open).toBe(false);
    expect(result.current.conversationId).toBeNull();
    expect(result.current.listingTitle).toBe('Nice Car'); // only open/conversationId are cleared
  });

  it('toggleMinimize flips the minimized flag independently of open state', () => {
    const { result } = renderHook(() => useMessenger(), { wrapper });
    act(() => result.current.toggleMinimize());
    expect(result.current.minimized).toBe(true);
    act(() => result.current.toggleMinimize());
    expect(result.current.minimized).toBe(false);
  });
});
