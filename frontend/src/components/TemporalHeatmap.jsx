import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function TemporalHeatmap({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-[#1e293b] rounded-xl bg-[#0a0f1a]">
        <div className="text-gray-500 font-mono text-sm">NO TEMPORAL DATA AVAILABLE</div>
      </div>
    );
  }

  // Format data for Recharts ScatterChart
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const formattedData = data.map(d => ({
    x: d.hour,
    y: 6 - d.day, // Reverse Y axis so Monday is at the top
    z: d.count,
    dayName: days[d.day]
  }));

  const maxCount = Math.max(...data.map(d => d.count));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#05080f] border border-[#1e293b] p-3 rounded shadow-xl">
          <p className="text-white font-bold mb-1">{data.dayName} at {data.x}:00 UTC</p>
          <p className="text-[#22d3ee] font-mono text-xs">{data.z} Transactions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#0a0f1a] border border-[#1e293b] rounded-xl p-5">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee] animate-pulse"></span>
            Temporal Activity (Timezone Heatmap)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Transaction frequency by Day of Week & Hour of Day (UTC)</p>
        </div>
      </div>
      
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Hour" 
              domain={[0, 23]} 
              tickCount={24} 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(val) => `${val}h`}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Day" 
              domain={[0, 6]} 
              tickCount={7} 
              stroke="#475569" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickFormatter={(val) => days[6 - val]}
            />
            <ZAxis 
              type="number" 
              dataKey="z" 
              range={[20, 600]} 
              domain={[0, maxCount]} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#334155' }} />
            <Scatter name="Transactions" data={formattedData} fill="#22d3ee" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
