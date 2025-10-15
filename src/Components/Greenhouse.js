import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import './App.css';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXHnvNZkb00PXbG5JidbD4PbRgf7l6Lgg",
  authDomain: "v2v-communication-d46c6.firebaseapp.com",
  databaseURL: "https://v2v-communication-d46c6-default-rtdb.firebaseio.com",
  projectId: "v2v-communication-d46c6",
  storageBucket: "v2v-communication-d46c6.firebasestorage.app",
  messagingSenderId: "536888356116",
  appId: "1:536888356116:web:983424cdcaf8efdd4e2601",
  measurementId: "G-H0YN6PE3S1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [data, setData] = useState({
    Battery: 0,
    Current: 0,
    Fan: "0",
    Humidity: 0,
    Pump: "0",
    Soil_Moisture: 0,
    Temperature: 0,
    Voltage: 0
  });

  const [historyData, setHistoryData] = useState({
    temperature: [],
    humidity: [],
    soilMoisture: [],
    voltage: []
  });

  useEffect(() => {
    const dataRef = ref(database, 'Green_House');
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(val);
        
        // Update history for graphs (keep last 10 readings)
        const timestamp = new Date().toLocaleTimeString();
        setHistoryData(prev => ({
          temperature: [...prev.temperature.slice(-9), { time: timestamp, value: val.Temperature || 0 }],
          humidity: [...prev.humidity.slice(-9), { time: timestamp, value: val.Humidity || 0 }],
          soilMoisture: [...prev.soilMoisture.slice(-9), { time: timestamp, value: val.Soil_Moisture || 0 }],
          voltage: [...prev.voltage.slice(-9), { time: timestamp, value: val.Voltage || 0 }]
        }));
      }
    });

    return () => unsubscribe();
  }, []);

  const SensorCard = ({ title, value, unit, icon, status, color }) => (
    <div className={`sensor-card ${color}`}>
      <div className="card-header">
        <span className="card-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="card-body">
        <div className="sensor-value">{value}{unit}</div>
        {status && <div className={`status-badge ${status === 'ON' ? 'status-on' : 'status-off'}`}>
          {status}
        </div>}
      </div>
      <div className="card-pulse"></div>
    </div>
  );

  const WaveChart = ({ data, title, color, dataKey = "value" }) => (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="time" stroke="#fff" fontSize={10} />
          <YAxis stroke="#fff" fontSize={10} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              border: 'none', 
              borderRadius: '8px',
              color: '#fff'
            }} 
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fill={`url(#gradient-${color})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>🌱 Greenhouse Monitoring System</h1>
          <div className="status-indicator">
            <span className="live-dot"></span>
            <span>Live</span>
          </div>
        </div>
      </header>

      <div className="container">
        <section className="sensors-grid">
          <SensorCard
            title="Temperature"
            value={data.Temperature}
            unit="°C"
            icon="🌡️"
            color="card-orange"
          />
          <SensorCard
            title="Humidity"
            value={data.Humidity}
            unit="%"
            icon="💧"
            color="card-blue"
          />
          <SensorCard
            title="Soil Moisture"
            value={data.Soil_Moisture}
            unit=""
            icon="🌿"
            color="card-green"
          />
          <SensorCard
            title="Battery"
            value={data.Battery}
            unit="%"
            icon="🔋"
            color="card-yellow"
          />
          <SensorCard
            title="Voltage"
            value={data.Voltage}
            unit="V"
            icon="⚡"
            color="card-purple"
          />
          <SensorCard
            title="Current"
            value={data.Current}
            unit="A"
            icon="⚡"
            color="card-pink"
          />
          <SensorCard
            title="Fan"
            value=""
            unit=""
            icon="🌀"
            status={data.Fan === "1" ? "ON" : "OFF"}
            color="card-cyan"
          />
          <SensorCard
            title="Pump"
            value=""
            unit=""
            icon="💦"
            status={data.Pump === "1" ? "ON" : "OFF"}
            color="card-teal"
          />
        </section>

        <section className="charts-section">
          <h2 className="section-title">Real-time Analytics</h2>
          <div className="charts-grid">
            <WaveChart 
              data={historyData.temperature} 
              title="Temperature Trend" 
              color="#ff6b6b"
            />
            <WaveChart 
              data={historyData.humidity} 
              title="Humidity Trend" 
              color="#4ecdc4"
            />
            <WaveChart 
              data={historyData.soilMoisture} 
              title="Soil Moisture Trend" 
              color="#95e1d3"
            />
            <WaveChart 
              data={historyData.voltage} 
              title="Voltage Trend" 
              color="#a8e6cf"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;