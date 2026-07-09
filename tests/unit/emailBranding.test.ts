import { describe, it, expect } from 'vitest';
import { emailHeader, emailFooterText, emailWrap } from '@/lib/emailBranding';

describe('emailHeader', () => {
  it('contains the brand name', () => {
    expect(emailHeader).toContain('Garage');
    expect(emailHeader).toContain('Cherries');
  });

  it('contains the cherry image', () => {
    expect(emailHeader).toContain('cherries.png');
  });

  it('is a non-empty string', () => {
    expect(typeof emailHeader).toBe('string');
    expect(emailHeader.length).toBeGreaterThan(0);
  });
});

describe('emailFooterText', () => {
  it('contains the domain', () => {
    expect(emailFooterText).toContain('garagecherries.com');
  });

  it('contains a link', () => {
    expect(emailFooterText).toContain('<a href=');
  });

  it('is a non-empty string', () => {
    expect(typeof emailFooterText).toBe('string');
    expect(emailFooterText.length).toBeGreaterThan(0);
  });
});

describe('emailWrap', () => {
  it('wraps the body in a container div', () => {
    const result = emailWrap('<p>Hello</p>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('includes the email header', () => {
    const result = emailWrap('test body');
    expect(result).toContain('Garage');
  });

  it('includes the body content in a padded section', () => {
    const result = emailWrap('my content here');
    expect(result).toContain('my content here');
  });

  it('applies max-width container styles', () => {
    const result = emailWrap('body');
    expect(result).toContain('max-width:600px');
  });

  it('returns a string', () => {
    expect(typeof emailWrap('anything')).toBe('string');
  });

  it('handles empty body', () => {
    const result = emailWrap('');
    expect(typeof result).toBe('string');
    expect(result).toContain('max-width:600px');
  });

  it('handles HTML in the body', () => {
    const body = '<h2>Subject</h2><p>Details: <strong>important</strong></p>';
    const result = emailWrap(body);
    expect(result).toContain('<h2>Subject</h2>');
    expect(result).toContain('<strong>important</strong>');
  });
});
