import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, DollarSign, Cpu, RefreshCw, Settings } from 'lucide-react';
import { formatCost, formatDuration } from '../hooks/usePolling.js';

function StatusDot({ online }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: online ? '#10B981' : '#EF4444',
      boxShadow: online
        ? '0 0 6px #10B981'
        : '0 0 6px #EF4444',
      animation: online ? 'pulse-dot 2s ease-in-out infinite' : 'none',
    }} />
  );
}

function StatusItem({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.75rem',
    }}>
      <Icon size={13} style={{ color: color || '#525252', opacity: 0.8 }} />
      <span style={{ color: '#525252' }}>{label}</span>
      <span style={{ color: '#A3A3A3', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function IconButton({ icon: Icon, onClick, title, spinning = false }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'transparent',
        border: '1px solid transparent',
        borderColor: hovered ? '#2A2A4A' : 'transparent',
        borderRadius: '4px',
        padding: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'border-color 150ms ease, background 150ms ease',
        ...(hovered ? { background: '#1A1A2E' } : {}),
      }}
    >
      <Icon
        size={14}
        style={{
          color: hovered ? '#D97706' : '#525252',
          transition: 'color 150ms ease',
          ...(spinning ? { animation: 'spin 1s linear infinite' } : {}),
        }}
      />
    </button>
  );
}

export function StatusBar({ status = {}, onRefresh, onThemeChange, onSettings }) {
  const [time, setTime] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  }, [onRefresh, refreshing]);

  const {
    gateway = 'online',
    agents = 0,
    cost = 0,
    context = 0,
    sessionDuration = 0,
  } = status;

  const isOnline = gateway === 'online';
  const timeStr = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 20px',
      background: '#1A1A2E',
      border: '1px solid #2A2A4A',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      {/* Left: Gateway status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '120px',
      }}>
        <StatusDot online={isOnline} />
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isOnline ? '#10B981' : '#EF4444',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Center: Metrics */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <StatusItem
          icon={Cpu}
          label="Agents"
          value={agents}
          color="#6366F1"
        />

        <div style={{
          width: '1px',
          height: '16px',
          background: '#2A2A4A',
        }} />

        <StatusItem
          icon={DollarSign}
          label="Cost"
          value={formatCost(cost)}
          color="#D97706"
        />

        <div style={{
          width: '1px',
          height: '16px',
          background: '#2A2A4A',
        }} />

        <StatusItem
          icon={Activity}
          label="Context"
          value={`${typeof context === 'number' ? context.toFixed(0) : context}%`}
          color={context > 85 ? '#EF4444' : context > 70 ? '#F59E0B' : '#10B981'}
        />

        <div style={{
          width: '1px',
          height: '16px',
          background: '#2A2A4A',
        }} />

        <StatusItem
          icon={Clock}
          label="Session"
          value={typeof sessionDuration === 'number' ? formatDuration(sessionDuration) : sessionDuration}
          color="#A3A3A3"
        />

        <div style={{
          width: '1px',
          height: '16px',
          background: '#2A2A4A',
        }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.75rem',
        }}>
          <Clock size={13} style={{ color: '#525252', opacity: 0.8 }} />
          <span style={{ color: '#A3A3A3', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            {timeStr}
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        minWidth: '80px',
        justifyContent: 'flex-end',
      }}>
        <IconButton
          icon={RefreshCw}
          onClick={handleRefresh}
          title="Refresh data"
          spinning={refreshing}
        />
        <IconButton
          icon={Settings}
          onClick={onSettings}
          title="Settings"
        />
      </div>
    </div>
  );
}
