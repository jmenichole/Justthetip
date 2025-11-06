import { useEffect, useState } from 'react';

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return date.toLocaleString();
};

export default function TipHistory() {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTips() {
      try {
        setLoading(true);
        const response = await fetch('/api/tips');
        if (!response.ok) {
          throw new Error('Failed to load tip history');
        }

        const payload = await response.json();
        if (!cancelled) {
          setTips(payload.tips || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTips();

    const interval = setInterval(loadTips, 15_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return <div className="p-6 text-slate-300">Loading latest tips...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-900/40 border border-rose-700 text-rose-100 rounded-lg">
        Uh oh! {error}
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-900/60 border border-slate-700 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Recent Tips</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-700">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Sender</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Receiver</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
            </tr>
          </thead>
          <tbody className="bg-slate-900/40 divide-y divide-slate-800">
            {tips.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No tips have been recorded yet. Be the first to send one! 🪙
                </td>
              </tr>
            ) : (
              tips.map((tip) => (
                <tr key={`${tip.signature || tip.timestamp}-${tip.sender}-${tip.receiver}`} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-200">{tip.sender}</td>
                  <td className="px-4 py-3 text-slate-200">{tip.receiver}</td>
                  <td className="px-4 py-3 text-slate-100 font-semibold">{tip.amount} {tip.currency}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{formatDate(tip.timestamp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
