import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSend, mockLoggerInfo, mockLoggerError, mockLoggerFlush } = vi.hoisted(() => ({
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
  mockLoggerInfo:  vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: vi.fn(), error: mockLoggerError, flush: mockLoggerFlush }),
}));

import { buildAdfLeadXml, sendAdfLead } from '@/lib/adfLead';

beforeEach(() => {
  vi.clearAllMocks();
});

const baseParams = {
  dealerName: 'Beverly Hills Car Club',
  listingId: 'listing-1',
  vehicle: { year: 1986, make: 'Mercedes-Benz', model: '560SL', vin: 'WDBBA48D4GA123456', stockNumber: 'STK1' },
  customer: { name: 'Paul O\'Brien', email: 'paul@x.com', comments: 'Is this still available?' },
};

describe('buildAdfLeadXml', () => {
  it('includes the standard ADF 1.0 document type and structure', () => {
    const xml = buildAdfLeadXml(baseParams);
    expect(xml).toContain('<!DOCTYPE adf PUBLIC "-//ADF//DTD ADF 1.0//EN"');
    expect(xml).toContain('<adf>');
    expect(xml).toContain('<prospect>');
  });

  it('includes vehicle, customer, vendor, and provider fields', () => {
    const xml = buildAdfLeadXml(baseParams);
    expect(xml).toContain('<year>1986</year>');
    expect(xml).toContain('<make>Mercedes-Benz</make>');
    expect(xml).toContain('<model>560SL</model>');
    expect(xml).toContain('<vin>WDBBA48D4GA123456</vin>');
    expect(xml).toContain('<stock>STK1</stock>');
    expect(xml).toContain('<email>paul@x.com</email>');
    expect(xml).toContain('<vendorname>Beverly Hills Car Club</vendorname>');
    expect(xml).toContain('<name part="full">GarageCherries</name>');
  });

  it('escapes XML special characters in buyer-entered fields so a message cannot break the document', () => {
    const xml = buildAdfLeadXml({
      ...baseParams,
      customer: { name: 'A & B <script>alert(1)</script>', email: 'x@y.com', comments: `"quoted" & <tag>` },
    });
    expect(xml).toContain('A &amp; B &lt;script&gt;alert(1)&lt;/script&gt;');
    expect(xml).toContain('&quot;quoted&quot; &amp; &lt;tag&gt;');
    expect(xml).not.toContain('<script>');
  });

  it('includes a phone element when provided', () => {
    const xml = buildAdfLeadXml({
      ...baseParams,
      customer: { ...baseParams.customer, phone: '555-123-4567' },
    });
    expect(xml).toContain('<phone>555-123-4567</phone>');
  });

  it('omits vin/stock/phone/comments elements entirely when not provided', () => {
    const xml = buildAdfLeadXml({
      dealerName: 'Test Dealer',
      listingId: 'l2',
      vehicle: { year: 2001, make: 'Ford', model: 'Mustang' },
      customer: { name: 'Jane', email: 'jane@x.com' },
    });
    expect(xml).not.toContain('<vin>');
    expect(xml).not.toContain('<stock>');
    expect(xml).not.toContain('<phone>');
    expect(xml).not.toContain('<comments>');
  });

  it("apostrophes in a buyer's name are escaped", () => {
    const xml = buildAdfLeadXml(baseParams);
    expect(xml).toContain('<name part="full">Paul O&apos;Brien</name>');
  });
});

describe('sendAdfLead', () => {
  it('sends the ADF XML as the email body with subject "ADF"', async () => {
    await sendAdfLead('leads@dealer-crm.example', baseParams);
    expect(mockSend).toHaveBeenCalledOnce();
    const call = mockSend.mock.calls[0][0];
    expect(call.to).toBe('leads@dealer-crm.example');
    expect(call.subject).toBe('ADF');
    expect(call.text).toContain('<adf>');
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it('logs and swallows the error instead of throwing when the send fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('resend down'));
    await expect(sendAdfLead('leads@dealer-crm.example', baseParams)).resolves.toBeUndefined();
    expect(mockLoggerError).toHaveBeenCalledWith('ADF lead send failed', expect.any(Error), expect.objectContaining({ adfLeadEmail: 'leads@dealer-crm.example' }));
  });
});
