import React from 'react';

const COLORS = {
  SAFE: "bg-axon-green/20 text-axon-green border-axon-green/50 shadow-glow-green",
  LOW: "bg-axon-blue/20 text-axon-blue border-axon-blue/50 shadow-glow-blue",
  MEDIUM: "bg-axon-yellow/20 text-axon-yellow border-axon-yellow/50",
  HIGH: "bg-axon-orange/20 text-axon-orange border-axon-orange/50 shadow-glow-orange",
  CRITICAL: "bg-axon-red/20 text-axon-red border-axon-red/50 shadow-glow-red",
};

export default function RiskBadge({ label }) {
  const colorClass = COLORS[label] || COLORS.MEDIUM;
  return (
    <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wider border ${colorClass} uppercase`}>
      {label}
    </span>
  );
}
