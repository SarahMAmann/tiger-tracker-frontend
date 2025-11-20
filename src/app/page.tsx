'use client';
import Latest from '../components/Latest';
import Insights from '../components/Insights';
import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer
} from 'recharts';


// Poll the API every 30s
const POLL_MS = 30_000;


export default function Page() {
  const [series, setSeries] = useState<Record<string, { t: string[]; v: number[] }>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());


  async function load() {
    const res = await fetch('/api/series', { cache: 'no-store' });
    const json = await res.json();
    setSeries(json.data || {});
    setLastUpdate(new Date());
  }


  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, []);


  // Transform into Recharts-friendly rows keyed by timestamp
  const data = useMemo(() => {
    // gather all timestamps
    const allTs = new Set<string>();
    Object.values(series).forEach(s => s.t.forEach(ts => allTs.add(ts)));
    const ordered = Array.from(allTs).sort();


    return ordered.map(ts => {
      const row: Record<string, any> = { ts };
      for (const [symbol, s] of Object.entries(series)) {
        const idx = s.t.indexOf(ts);
        row[symbol] = idx >= 0 ? s.v[idx] : null; // gaps allowed
      }
      return row;
    });
  }, [series]);


  const symbols = Object.keys(series);
  const colors = ['#00d4aa', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-400">Tiger Crypto Tracker</h1>
            <p className="text-sm text-gray-400">Real-time cryptocurrency price monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Left Sidebar - Live Prices */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 p-6 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Live Prices</h2>
          <Latest />
          
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Market Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Symbols:</span>
                <span className="text-white">{symbols.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Data Points:</span>
                <span className="text-white">{data.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Update Interval:</span>
                <span className="text-white">30s</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Chart Area */}
        <main className="flex-1 p-6 min-w-0">
          <div className="bg-gray-800 rounded-lg border border-gray-700 h-full">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-gray-200">Price Chart</h2>
              <p className="text-sm text-gray-400 mt-1">5-minute averages over last 24 hours</p>
            </div>
            
            <div className="h-[calc(100%-120px)] p-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="ts" 
                    tickFormatter={(v) => new Date(v).toLocaleTimeString()} 
                    minTickGap={32}
                    stroke="#9ca3af"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    labelFormatter={(v) => new Date(v as string).toLocaleString()}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb'
                    }}
                    formatter={(value: any, name: string) => [
                      `$${Number(value).toLocaleString()}`, 
                      name
                    ]}
                  />
                  <Legend />
                  {symbols.map((s, index) => (
                    <Line 
                      key={s} 
                      type="monotone" 
                      dataKey={s} 
                      dot={false} 
                      strokeWidth={2.5} 
                      stroke={colors[index % colors.length]}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </main>

        {/* Right Sidebar - AI Insights */}
        <aside className="w-96 bg-gray-800 border-l border-gray-700 p-6 overflow-y-auto">
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xl">🤖</span>
            <h2 className="text-lg font-semibold text-gray-200">AI Insights</h2>
          </div>
          <Insights />
        </aside>
      </div>
    </div>
  );
}