import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] animate-fade-in text-center">
      <div className="text-8xl font-extrabold font-mono text-axon-border-light mb-4 select-none">404</div>
      <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
      <p className="text-axon-text-muted text-sm mb-8 max-w-md">
        The page you're looking for doesn't exist or has been moved. AXON is still expanding — check back soon.
      </p>
      <Link to="/overview" className="axon-button axon-button-primary px-6 py-2.5 text-sm">
        ← Back to Overview
      </Link>
    </div>
  );
}
