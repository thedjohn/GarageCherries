interface Props {
  providerName: string;
  reportDate: string | null;
  summary: string | null;
  reportUrl: string | null;
}

export default function InspectionReportCard({ providerName, reportDate, summary, reportUrl }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-extrabold italic text-red-600 uppercase tracking-wider mb-2">Independent Inspection</h3>
          <p className="text-sm font-semibold text-zinc-800">{providerName}</p>
          {reportDate && <p className="text-xs text-zinc-500">{new Date(reportDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}</p>}
          {summary && <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{summary}</p>}
        </div>
        {reportUrl && (
          <a href={reportUrl} target="_blank" rel="noopener noreferrer"
            className="shrink-0 text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
            View Full Report ↗
          </a>
        )}
      </div>
      <p className="text-xs text-zinc-400 mt-4 pt-4 border-t border-zinc-100">
        This report was prepared solely by {providerName}{' '}and is provided &quot;as-is&quot; for informational
        purposes only. GarageCherries did not commission, participate in, or verify this inspection, and makes no
        representation or warranty as to its accuracy, completeness, or currency. This report does not constitute
        a warranty, guarantee, or certification of the vehicle&apos;s condition. Buyers are solely responsible for
        independently verifying the vehicle&apos;s condition before purchase.
      </p>
    </div>
  );
}
