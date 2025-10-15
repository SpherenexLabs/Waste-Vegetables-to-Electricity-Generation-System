import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './App.css';

// Reusable components hoisted to top-level to avoid remounting on each render
const PowerCard = React.memo(({ title, value, unit, icon, color, description }) => (
  <div className={`power-card ${color}`}>
    <div className="power-card-header">
      <div className="power-icon">{icon}</div>
      <div className="power-card-info">
        <h3>{title}</h3>
        <p className="power-description">{description}</p>
      </div>
    </div>
    <div className="power-card-body">
      <div className="power-value">
        {value}
        <span className="power-unit">{unit}</span>
      </div>
    </div>
    <div className="power-card-wave"></div>
  </div>
));

const MetricChart = React.memo(({ data, title, color, dataKey = 'value', unit = '' }) => {
  const gradId = `grad-${String(color).replace('#', '')}`; // avoid '#'' in id for url(#...)
  const latest = data && data.length > 0 ? data[data.length - 1].value : 0;
  return (
    <div className="metric-chart">
      <div className="chart-header">
        <h3>{title}</h3>
        <span className="chart-current-value">
          {Number(latest).toFixed(4)} {unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.9} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="time"
            stroke="rgba(255,255,255,0.5)"
            fontSize={9}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <YAxis
            stroke="rgba(255,255,255,0.5)"
            fontSize={9}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0,0,0,0.9)',
              border: `1px solid ${color}`,
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            labelStyle={{ color: color }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradId})`}
            strokeWidth={2}
            isAnimationActive={false} // disable Recharts animation to prevent flicker
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXHnvNZkb00PXbG5JidbD4PbRgf7l6Lgg",
  authDomain: "self-balancing-7a9fe.firebaseapp.com",
  databaseURL: "https://self-balancing-7a9fe-default-rtdb.firebaseio.com",
  projectId: "self-balancing-7a9fe",
  storageBucket: "self-balancing-7a9fe.firebasestorage.app",
  messagingSenderId: "536888356116",
  appId: "1:536888356116:web:983424cdcaf8efdd4e2601"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [data, setData] = useState({
    I: 0,
    P: 0,
    PF: 0,
    S: 0,
    V: 0,
    ts: 0
  });

  const [historyData, setHistoryData] = useState({
    current: [],
    power: [],
    powerFactor: [],
    apparentPower: [],
    voltage: []
  });

  const [powerQuality, setPowerQuality] = useState('Good');

  useEffect(() => {
    const dataRef = ref(database, '25_Power_Factor');
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
        
        // Determine power quality based on power factor
        const pf = val.PF || 0;
        if (pf >= 0.95) setPowerQuality('Excellent');
        else if (pf >= 0.85) setPowerQuality('Good');
        else if (pf >= 0.7) setPowerQuality('Fair');
        else setPowerQuality('Poor');
        
        // Update history for graphs (keep last 15 readings)
        const timestamp = new Date().toLocaleTimeString();
        setHistoryData(prev => ({
          current: [...prev.current.slice(-14), { time: timestamp, value: val.I || 0 }],
          power: [...prev.power.slice(-14), { time: timestamp, value: val.P || 0 }],
          powerFactor: [...prev.powerFactor.slice(-14), { time: timestamp, value: val.PF || 0 }],
          apparentPower: [...prev.apparentPower.slice(-14), { time: timestamp, value: val.S || 0 }],
          voltage: [...prev.voltage.slice(-14), { time: timestamp, value: val.V || 0 }]
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const getQualityColor = () => {
    switch(powerQuality) {
      case 'Excellent': return '#00ff88';
      case 'Good': return '#4ecdc4';
      case 'Fair': return '#ffd93d';
      case 'Poor': return '#ff6b6b';
      default: return '#fff';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>⚡ Power Factor Monitoring System</h1>
            <p className="header-subtitle">Real-time Electrical Power Analysis</p>
          </div>
          <div className="header-status">
            <div className="status-indicator">
              <span className="live-pulse"></span>
              <span>Live Monitoring</span>
            </div>
            <div className="quality-badge" style={{ borderColor: getQualityColor(), color: getQualityColor() }}>
              Power Quality: {powerQuality}
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Main Metrics Grid */}
        <section className="metrics-grid">
          <PowerCard
            title="Current"
            value={data.I.toFixed(5)}
            unit="A"
            icon="⚡"
            color="current-card"
            description="Instantaneous Current"
          />
          <PowerCard
            title="Voltage"
            value={data.V.toFixed(5)}
            unit="V"
            icon="🔌"
            color="voltage-card"
            description="Line Voltage"
          />
          <PowerCard
            title="Active Power"
            value={data.P.toFixed(5)}
            unit="W"
            icon="💡"
            color="power-card"
            description="Real Power Consumption"
          />
          <PowerCard
            title="Apparent Power"
            value={data.S.toFixed(4)}
            unit="VA"
            icon="⚙️"
            color="apparent-card"
            description="Total Power"
          />
          <PowerCard
            title="Power Factor"
            value={data.PF.toFixed(5)}
            unit=""
            icon="📊"
            color="pf-card"
            description="Efficiency Indicator"
          />
          <PowerCard
            title="Timestamp"
            value={data.ts}
            unit=""
            icon="🕐"
            color="time-card"
            description="Data Sample Time"
          />
        </section>

       

        {/* Real-time Charts */}
        <section className="charts-section">
          <h2 className="section-title">
            <span className="title-icon">📊</span>
            Real-time Waveform Analysis
          </h2>
          <div className="charts-grid">
            <MetricChart 
              data={historyData.current} 
              title="Current (I)" 
              color="#ffeb3b"
              unit="A"
            />
            <MetricChart 
              data={historyData.voltage} 
              title="Voltage (V)" 
              color="#2196f3"
              unit="V"
            />
            <MetricChart 
              data={historyData.power} 
              title="Active Power (P)" 
              color="#4caf50"
              unit="W"
            />
            <MetricChart 
              data={historyData.apparentPower} 
              title="Apparent Power (S)" 
              color="#ff9800"
              unit="VA"
            />
            <MetricChart 
              data={historyData.powerFactor} 
              title="Power Factor (PF)" 
              color="#e91e63"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;