import React from 'react';

export default function ScoreCard({ score, label }) {
  // Map score 0-100 to color
  const getColor = (s) => {
    if (s >= 70) return '#ef4444'; // CRITICAL - Red
    if (s >= 40) return '#f97316'; // HIGH - Orange
    if (s >= 20) return '#eab308'; // MEDIUM - Yellow
    if (s > 0) return '#3b82f6';   // LOW - Blue
    return '#22c55e';              // SAFE - Green
  };

  const color = getColor(score);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  // Calculate dash offset based on score (0 = empty, 100 = full)
  // But wait, higher score means HIGHER risk. So if score is 100, we fill the whole circle.
  const dashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel">
      <div className="relative w-40 h-40">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-axon-border"
          />
          {/* Progress circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            className="transition-all duration-1000 ease-out animate-score-fill"
          />
        </svg>
        {/* Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-axon-text-muted mt-1 uppercase tracking-widest">Risk</span>
        </div>
      </div>
      <div className="mt-6 text-center">
        <h3 className="text-lg font-medium text-axon-text mb-1">Overall Risk Level</h3>
        <p className="text-sm text-axon-text-dim">Score is calculated based on identified vulnerabilities and heuristic analysis.</p>
      </div>
    </div>
  );
}
