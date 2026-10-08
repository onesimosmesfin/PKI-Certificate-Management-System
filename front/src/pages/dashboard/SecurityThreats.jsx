import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Zap, Globe, Clock, RefreshCw } from 'lucide-react';

import { GlassCard, Button } from '../../components/ui/Core';
import { getSecurityAlerts, getSecurityStats, revokeSecurityThreatById } from '../../services/security';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api').replace(/\/api\/?$/, '');
const WS_URL = API_ORIGIN + '/ws';

export default function SecurityThreats() {
  const [threats, setThreats] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('All');
  const [lastUpdated, setLastUpdated] = useState('Just now');

  const fetchData = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        getSecurityAlerts(),
        getSecurityStats(),
      ]);

      setThreats(alertsRes);
      setStats(statsRes);
      setLastUpdated('Just now');
    } catch (err) {
      console.error('Failed loading security data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const socket = new SockJS(WS_URL);

    const stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      onConnect: () => {
        stompClient.subscribe('/topic/threats', (message) => {
          const newThreat = JSON.parse(message.body);

          setThreats((previous) => [newThreat, ...previous]);
          setLastUpdated('Just now');

          getSecurityStats()
            .then((response) => setStats(response))
            .catch(() => {});
        });
      },
    });

    stompClient.activate();

    return () => stompClient.deactivate();
  }, []);

  const filteredThreats =
    filter === 'All'
      ? threats
      : threats.filter((threat) => threat.severity === filter);

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this threat block?')) {
      return;
    }

    try {
      await revokeSecurityThreatById(id);
      setThreats((previous) => previous.filter((threat) => threat.id !== id));
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  const safeStats = {
    total: stats.total || 0,
    critical: stats.critical || 0,
    high: stats.high || 0,
    medium: stats.medium || 0,
  };

  const severityStyles = {
    CRITICAL: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
    HIGH: {
      bg: 'bg-orange-500/10',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
  };

  return (
    <div className="app-shell mx-auto min-h-screen max-w-[1700px] space-y-8 p-6">
      <div className="flex items-center justify-between border-b border-[rgb(var(--app-border))] pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10">
            <Zap className="h-6 w-6 text-red-500" />
          </div>

          <div>
            <h1 className="app-heading text-3xl font-bold">
              Threat Intelligence Center
            </h1>
            <p className="app-muted">
              Live security monitoring
              <span className="ml-2 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                LIVE
              </span>
            </p>
          </div>
        </div>

        <div className="app-muted flex items-center gap-3 text-sm">
          <Clock size={16} />
          {lastUpdated}

          <Button className="px-3 py-2" onClick={fetchData}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <p className="app-muted text-sm">Total Threats</p>
          <p className="app-heading text-4xl">{safeStats.total}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted text-sm">Critical</p>
          <p className="text-4xl text-red-400">{safeStats.critical}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted text-sm">High</p>
          <p className="text-4xl text-orange-400">{safeStats.high}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="app-muted text-sm">Medium</p>
          <p className="text-4xl text-amber-400">{safeStats.medium}</p>
        </GlassCard>
      </div>

      <div className="flex gap-2">
        {['All', 'CRITICAL', 'HIGH', 'MEDIUM'].map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-xl px-4 py-2 text-xs ${
              filter === value
                ? 'bg-red-500 text-white'
                : 'app-surface-strong app-muted'
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredThreats.map((threat) => {
          const style = severityStyles[threat.severity] || severityStyles.MEDIUM;

          return (
            <GlassCard key={threat.id} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.bg} ${style.border}`}>
                    <Globe className={style.text} />
                  </div>

                  <div>
                    <p className="app-heading font-mono">{threat.ip}</p>
                    <p className="app-muted text-sm">{threat.reason}</p>
                    <p className="app-muted text-xs">
                      {threat.country} - {threat.attempts ?? 0} attempts
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`rounded px-2 py-1 text-xs ${style.bg} ${style.text}`}>
                    {threat.severity}
                  </span>

                  <Button
                    variant="secondary"
                    className="border-red-500/20 text-red-300 hover:bg-red-500/10"
                    onClick={() => handleRevoke(threat.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {filteredThreats.length === 0 && (
        <GlassCard className="p-10 text-center text-slate-400">
          No threats found
        </GlassCard>
      )}
    </div>
  );
}
