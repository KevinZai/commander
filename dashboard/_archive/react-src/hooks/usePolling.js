import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for polling local data sources.
 *
 * @param {Function} fetchFn - Async function that returns data.
 * @param {Object} options
 * @param {number} options.interval - Polling interval in milliseconds (default: 5000).
 * @param {boolean} options.enabled - Whether polling is active (default: true).
 * @param {*} options.initialData - Initial data value before first fetch.
 * @returns {{ data: *, error: Error|null, loading: boolean, lastUpdated: Date|null, refresh: Function }}
 */
export function usePolling(fetchFn, options = {}) {
  const {
    interval = 5000,
    enabled = true,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFnRef = useRef(fetchFn);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    refresh();

    intervalRef.current = setInterval(refresh, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, interval, refresh]);

  return { data, error, loading, lastUpdated, refresh };
}

/**
 * Fetches and parses a local JSON file.
 * Falls back to null on any error (file not found, parse failure, etc.).
 *
 * @param {string} url - URL or path to fetch.
 * @returns {Promise<*>}
 */
export async function fetchLocalJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Format a duration in seconds to a human-readable string.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Format a cost value to a dollar string.
 * @param {number} cost
 * @returns {string}
 */
export function formatCost(cost) {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

/**
 * Get a relative time string (e.g., "2m ago", "1h ago").
 * @param {Date|string|number} date
 * @returns {string}
 */
export function timeAgo(date) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
