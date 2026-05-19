import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * usePolling - Auto-refresh hook with visibility API support
 * Per D-03: Auto-polling every 30 seconds when panel is visible
 * @param {Function} fetchFn - Async function to call for data
 * @param {number} interval - Polling interval in ms (default: 30000)
 * @returns {Object} { data, loading, error, refetch }
 */
export function usePolling(fetchFn, interval = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isVisible = useRef(true);
  const fetchRef = useRef(fetchFn);

  // Keep fetchFn reference current
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  // Visibility API to pause polling when tab hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetch = useCallback(async () => {
    if (!isVisible.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      setData(result);
    } catch (err) {
      setError(err.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, interval);
    return () => clearInterval(id);
  }, [fetch, interval]);

  return { data, loading, error, refetch: fetch };
}

export default usePolling;