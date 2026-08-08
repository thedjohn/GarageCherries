'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resizeImageFiles } from '@/lib/resizeImage';

interface InspectionReport {
  id: string;
  listing_id: string;
  provider_name: string;
  report_date: string | null;
  summary: string | null;
  report_url: string;
  photo_urls: string[];
}

export default function InspectionReportSection({ carId }: { carId: string }) {
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [summary, setSummary] = useState('');
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/dealer/inspection?carId=${carId}`)
      .then(r => r.json())
      .then(data => {
        if (data.report) {
          setReport(data.report);
          setProviderName(data.report.provider_name);
          setReportDate(data.report.report_date ?? '');
          setSummary(data.report.summary ?? '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [carId]);

  const handleSave = async () => {
    if (!providerName.trim()) { setError('Provider name is required.'); return; }
    if (!reportFile && !report) { setError('Please attach the inspection report (PDF).'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();

    let reportUrl = report?.report_url ?? '';
    if (reportFile) {
      const ext = reportFile.name.split('.').pop();
      const path = `${carId}/${Date.now()}-report.${ext}`;
      const { error: uploadError } = await supabase.storage.from('inspection-reports').upload(path, reportFile, { upsert: true });
      if (uploadError) { setError('Report upload failed: ' + uploadError.message); setSaving(false); return; }
      const { data: { publicUrl } } = supabase.storage.from('inspection-reports').getPublicUrl(path);
      reportUrl = publicUrl;
    }

    let photoUrls = report?.photo_urls ?? [];
    if (photoFiles.length > 0) {
      const resized = await resizeImageFiles(photoFiles);
      const uploaded: string[] = [];
      for (const file of resized) {
        const ext = file.name.split('.').pop();
        const path = `${carId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('inspection-reports').upload(path, file);
        if (uploadError) { setError('Photo upload failed: ' + uploadError.message); setSaving(false); return; }
        const { data: { publicUrl } } = supabase.storage.from('inspection-reports').getPublicUrl(path);
        uploaded.push(publicUrl);
      }
      photoUrls = [...photoUrls, ...uploaded];
    }

    const res = await fetch('/api/dealer/inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        carId, providerName: providerName.trim(),
        reportDate: reportDate || null, summary: summary.trim() || null,
        reportUrl, photoUrls,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? 'Failed to save.'); return; }
    setReport(data.report);
    setReportFile(null);
    setPhotoFiles([]);
    setEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const handleRemove = async () => {
    if (!confirm('Remove this inspection report?')) return;
    setSaving(true);
    await fetch(`/api/dealer/inspection?carId=${carId}`, { method: 'DELETE' });
    setReport(null);
    setProviderName(''); setReportDate(''); setSummary('');
    setSaving(false);
    setEditing(false);
  };

  const inp = "w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500";

  if (loading) return null;

  return (
    <div className="border-t border-zinc-100 pt-6">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
        Independent Inspection Report <span className="normal-case font-normal text-zinc-400">(optional)</span>
      </p>
      <p className="text-xs text-zinc-400 mb-3">
        Attach a third-party inspection report. Buyers will see a summary card — this is shown as an independent
        condition assessment, not a GarageCherries certification or warranty.
      </p>

      {report && !editing ? (
        <div className="bg-zinc-50 rounded-xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-800">{report.provider_name}</p>
            {report.report_date && <p className="text-xs text-zinc-500">{new Date(report.report_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>}
            {report.summary && <p className="text-xs text-zinc-500 mt-1">{report.summary}</p>}
            <a href={report.report_url} target="_blank" rel="noopener noreferrer" className="text-xs text-red-600 hover:underline mt-1 inline-block">View report ↗</a>
          </div>
          <div className="flex gap-3 shrink-0">
            <button type="button" onClick={() => setEditing(true)} className="text-xs text-zinc-500 hover:text-zinc-900 font-medium">Edit</button>
            <button type="button" onClick={handleRemove} disabled={saving} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Provider Name</label>
              <input type="text" placeholder="e.g. Lemon Squad" value={providerName} onChange={e => setProviderName(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Report Date</label>
              <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Summary <span className="text-zinc-400">(optional)</span></label>
            <textarea rows={2} placeholder="Brief summary of the inspection findings" value={summary} onChange={e => setSummary(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">
              Report File (PDF) {report ? <span className="text-zinc-400">— leave blank to keep the current file</span> : null}
            </label>
            <input ref={fileInputRef} type="file" accept="application/pdf" onChange={e => setReportFile(e.target.files?.[0] ?? null)} className="text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Additional Photos <span className="text-zinc-400">(optional)</span></label>
            <input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setPhotoFiles(Array.from(e.target.files ?? []))} className="text-sm" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            {editing && (
              <button type="button" onClick={() => { setEditing(false); setError(''); }}
                className="text-xs border border-zinc-200 text-zinc-600 font-semibold px-4 py-2 rounded-xl hover:bg-zinc-50">
                Cancel
              </button>
            )}
            <button type="button" onClick={handleSave} disabled={saving}
              className="text-xs bg-zinc-800 hover:bg-zinc-900 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl">
              {saving ? 'Saving…' : report ? 'Save Changes' : 'Attach Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
