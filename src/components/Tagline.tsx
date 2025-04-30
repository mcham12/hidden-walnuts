import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787";

export default function Tagline() {
  const [tagline, setTagline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTagline() {
      try {
        const res = await fetch(`${API_BASE}/tagline`);
        if (!res.ok) {
          throw new Error(`Failed to fetch tagline: ${res.status}`);
        }
        const data = await res.text();
        // Only set if we got actual data and it's not "null"
        if (data && data !== "null") {
          setTagline(data);
        } else {
          console.warn('No tagline data received from API');
        }
      } catch (error) {
        console.error('Error fetching tagline:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch tagline');
      }
    }

    fetchTagline();

    // Set up polling to keep tagline in sync
    const interval = setInterval(fetchTagline, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Show loading state if we don't have data yet
  if (!tagline && !error) {
    return <h1 style={{
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '2.2rem',
      color: '#1a2233',
      margin: '0.5rem 0',
      letterSpacing: '0.01em',
      lineHeight: 1.2,
      opacity: 0.5
    }}>Loading...</h1>;
  }

  // Show error state if something went wrong
  if (error) {
    console.error('Tagline error:', error);
    return null;
  }

  return (
    <h1 style={{
      fontFamily: 'Inter, Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '2.2rem',
      color: '#1a2233', // deep navy
      margin: '0.5rem 0',
      letterSpacing: '0.01em',
      lineHeight: 1.2,
    }}>
      {tagline}
    </h1>
  );
} 