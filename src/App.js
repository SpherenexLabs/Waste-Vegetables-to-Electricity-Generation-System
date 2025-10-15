// import React, { useState, useEffect } from 'react';
// import { initializeApp } from 'firebase/app';
// import { getDatabase, ref, onValue } from 'firebase/database';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
// import './App.css';

// // Reusable components hoisted to top-level to avoid remounting on each render
// const PowerCard = React.memo(({ title, value, unit, icon, color, description }) => (
//   <div className={`power-card ${color}`}>
//     <div className="power-card-header">
//       <div className="power-icon">{icon}</div>
//       <div className="power-card-info">
//         <h3>{title}</h3>
//         <p className="power-description">{description}</p>
//       </div>
//     </div>
//     <div className="power-card-body">
//       <div className="power-value">
//         {value}
//         <span className="power-unit">{unit}</span>
//       </div>
//     </div>
//     <div className="power-card-wave"></div>
//   </div>
// ));

// const MetricChart = React.memo(({ data, title, color, dataKey = 'value', unit = '' }) => {
//   const gradId = `grad-${String(color).replace('#', '')}`; // avoid '#'' in id for url(#...)
//   const latest = data && data.length > 0 ? data[data.length - 1].value : 0;
//   return (
//     <div className="metric-chart">
//       <div className="chart-header">
//         <h3>{title}</h3>
//         <span className="chart-current-value">
//           {Number(latest).toFixed(4)} {unit}
//         </span>
//       </div>
//       <ResponsiveContainer width="100%" height={180}>
//         <AreaChart data={data}>
//           <defs>
//             <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
//               <stop offset="5%" stopColor={color} stopOpacity={0.9} />
//               <stop offset="95%" stopColor={color} stopOpacity={0.1} />
//             </linearGradient>
//           </defs>
//           <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
//           <XAxis
//             dataKey="time"
//             stroke="rgba(255,255,255,0.5)"
//             fontSize={9}
//             tick={{ fill: 'rgba(255,255,255,0.6)' }}
//           />
//           <YAxis
//             stroke="rgba(255,255,255,0.5)"
//             fontSize={9}
//             tick={{ fill: 'rgba(255,255,255,0.6)' }}
//             width={45}
//           />
//           <Tooltip
//             contentStyle={{
//               backgroundColor: 'rgba(0,0,0,0.9)',
//               border: `1px solid ${color}`,
//               borderRadius: '8px',
//               color: '#fff',
//               fontSize: '12px',
//             }}
//             labelStyle={{ color: color }}
//           />
//           <Area
//             type="monotone"
//             dataKey={dataKey}
//             stroke={color}
//             fill={`url(#${gradId})`}
//             strokeWidth={2}
//             isAnimationActive={false} // disable Recharts animation to prevent flicker
//           />
//         </AreaChart>
//       </ResponsiveContainer>
//     </div>
//   );
// });

// // Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyAXHnvNZkb00PXbG5JidbD4PbRgf7l6Lgg",
//   authDomain: "self-balancing-7a9fe.firebaseapp.com",
//   databaseURL: "https://self-balancing-7a9fe-default-rtdb.firebaseio.com",
//   projectId: "self-balancing-7a9fe",
//   storageBucket: "self-balancing-7a9fe.firebasestorage.app",
//   messagingSenderId: "536888356116",
//   appId: "1:536888356116:web:983424cdcaf8efdd4e2601"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const database = getDatabase(app);

// const App = () => {
//   const [data, setData] = useState({
//     I: 0,
//     P: 0,
//     PF: 0,
//     S: 0,
//     V: 0,
//     ts: 0
//   });

//   const [historyData, setHistoryData] = useState({
//     current: [],
//     power: [],
//     powerFactor: [],
//     apparentPower: [],
//     voltage: []
//   });

//   const [powerQuality, setPowerQuality] = useState('Good');

//   useEffect(() => {
//     const dataRef = ref(database, '25_Power_Factor');
    
//     const unsubscribe = onValue(dataRef, (snapshot) => {
//       const val = snapshot.val();
//       if (val) {
//         setData(val);
        
//         // Determine power quality based on power factor
//         const pf = val.PF || 0;
//         if (pf >= 0.95) setPowerQuality('Excellent');
//         else if (pf >= 0.85) setPowerQuality('Good');
//         else if (pf >= 0.7) setPowerQuality('Fair');
//         else setPowerQuality('Poor');
        
//         // Update history for graphs (keep last 15 readings)
//         const timestamp = new Date().toLocaleTimeString();
//         setHistoryData(prev => ({
//           current: [...prev.current.slice(-14), { time: timestamp, value: val.I || 0 }],
//           power: [...prev.power.slice(-14), { time: timestamp, value: val.P || 0 }],
//           powerFactor: [...prev.powerFactor.slice(-14), { time: timestamp, value: val.PF || 0 }],
//           apparentPower: [...prev.apparentPower.slice(-14), { time: timestamp, value: val.S || 0 }],
//           voltage: [...prev.voltage.slice(-14), { time: timestamp, value: val.V || 0 }]
//         }));
//       }
//     });

//     return () => unsubscribe();
//   }, []);

//   const getQualityColor = () => {
//     switch(powerQuality) {
//       case 'Excellent': return '#00ff88';
//       case 'Good': return '#4ecdc4';
//       case 'Fair': return '#ffd93d';
//       case 'Poor': return '#ff6b6b';
//       default: return '#fff';
//     }
//   };

//   return (
//     <div className="app">
//       <header className="header">
//         <div className="header-content">
//           <div className="header-title">
//             <h1>⚡ Power Factor Monitoring System</h1>
//             <p className="header-subtitle">Real-time Electrical Power Analysis</p>
//           </div>
//           <div className="header-status">
//             <div className="status-indicator">
//               <span className="live-pulse"></span>
//               <span>Live Monitoring</span>
//             </div>
//             <div className="quality-badge" style={{ borderColor: getQualityColor(), color: getQualityColor() }}>
//               Power Quality: {powerQuality}
//             </div>
//           </div>
//         </div>
//       </header>

//       <div className="container">
//         {/* Main Metrics Grid */}
//         <section className="metrics-grid">
//           <PowerCard
//             title="Current"
//             value={data.I.toFixed(5)}
//             unit="A"
//             icon="⚡"
//             color="current-card"
//             description="Instantaneous Current"
//           />
//           <PowerCard
//             title="Voltage"
//             value={data.V.toFixed(5)}
//             unit="V"
//             icon="🔌"
//             color="voltage-card"
//             description="Line Voltage"
//           />
//           <PowerCard
//             title="Active Power"
//             value={data.P.toFixed(5)}
//             unit="W"
//             icon="💡"
//             color="power-card"
//             description="Real Power Consumption"
//           />
//           <PowerCard
//             title="Apparent Power"
//             value={data.S.toFixed(4)}
//             unit="VA"
//             icon="⚙️"
//             color="apparent-card"
//             description="Total Power"
//           />
//           <PowerCard
//             title="Power Factor"
//             value={data.PF.toFixed(5)}
//             unit=""
//             icon="📊"
//             color="pf-card"
//             description="Efficiency Indicator"
//           />
//           <PowerCard
//             title="Timestamp"
//             value={data.ts}
//             unit=""
//             icon="🕐"
//             color="time-card"
//             description="Data Sample Time"
//           />
//         </section>

       

//         {/* Real-time Charts */}
//         <section className="charts-section">
//           <h2 className="section-title">
//             <span className="title-icon">📊</span>
//             Real-time Waveform Analysis
//           </h2>
//           <div className="charts-grid">
//             <MetricChart 
//               data={historyData.current} 
//               title="Current (I)" 
//               color="#ffeb3b"
//               unit="A"
//             />
//             <MetricChart 
//               data={historyData.voltage} 
//               title="Voltage (V)" 
//               color="#2196f3"
//               unit="V"
//             />
//             <MetricChart 
//               data={historyData.power} 
//               title="Active Power (P)" 
//               color="#4caf50"
//               unit="W"
//             />
//             <MetricChart 
//               data={historyData.apparentPower} 
//               title="Apparent Power (S)" 
//               color="#ff9800"
//               unit="VA"
//             />
//             <MetricChart 
//               data={historyData.powerFactor} 
//               title="Power Factor (PF)" 
//               color="#e91e63"
//             />
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// };

// export default App;



import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
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
    Battery: "",
    Current: "",
    Motor: "",
    Voltage: "",
    PowerSupply: "ON", // Power supply status
    Cell1: "",
    Cell2: "",
    Cell3: "",
    Cell4: "",
    Cell5: "",
    Cell6: ""
  });

  const [historyData, setHistoryData] = useState({
    battery: [],
    current: [],
    voltage: [],
    cell1: [],
    cell2: [],
    cell3: [],
    cell4: [],
    cell5: [],
    cell6: []
  });

  const [isPowerOn, setIsPowerOn] = useState(true);
  // Cell voltages we actually render (derived from Battery when raw cells are missing)
  const [cellVoltages, setCellVoltages] = useState([0, 0, 0, 0, 0, 0]);
  // Track last current/voltage to decide when to update cells
  const lastCV = useRef({ current: 0, voltage: 0, initialized: false });

  useEffect(() => {
    const dataRef = ref(database, 'Juice');
    
    const unsubscribe = onValue(dataRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        // Check power supply status
        const powerStatus = val.PowerSupply || "ON";
        const powerOn = powerStatus.toUpperCase() === "ON" || powerStatus === "1";
        setIsPowerOn(powerOn);

        // Only update if power is on
        if (powerOn) {
          setData(val);
          
          // Update history for graphs (keep last 15 readings)
          const timestamp = new Date().toLocaleTimeString();
          const batteryVal = parseFloat(val.Battery) || 0;
          const currentVal = parseFloat(val.Current) || 0;
          const voltageVal = parseFloat(val.Voltage) || 0;
          
          // Decide whether to update cells: only when current or voltage increases,
          // or on the very first/initial render after power is ON
          const prevC = lastCV.current.current;
          const prevV = lastCV.current.voltage;
          const allowInitial = !lastCV.current.initialized || cellVoltages.every(v => v === 0);
          const incCurrent = currentVal > prevC;
          const incVoltage = voltageVal > prevV;
          const shouldUpdateCells = allowInitial || incCurrent || incVoltage;

          // remember last values
          lastCV.current = { current: currentVal, voltage: voltageVal, initialized: true };
          
          // Compute cells only if we should update
          if (shouldUpdateCells) {
            // Base depends on battery% and positive deltas in current/voltage
            const batteryNorm = Math.max(0, Math.min(1, batteryVal / 100));
            const deltaC = Math.max(0, currentVal - prevC);
            const deltaV = Math.max(0, voltageVal - prevV);
            // Simple scaling to 0..1 (tweakable): assume +5A and +5V are "strong" increases
            const incScore = Math.max(0, Math.min(1, (deltaC / 5) + (deltaV / 5)));
            const base = 1.0 + 0.5 * (0.6 * batteryNorm + 0.4 * incScore);

            const offsets = [-0.08, -0.05, -0.02, 0.02, 0.05, 0.08];
            const clamp = (x) => Math.max(1.0, Math.min(1.5, x));
            const avoidTrailingFive = (x, idx) => {
              let v = parseFloat(x.toFixed(3));
              if (v.toFixed(3).endsWith('5')) {
                const delta = idx % 2 === 0 ? 0.001 : -0.001;
                v = clamp(v + delta);
                v = parseFloat(v.toFixed(3));
              }
              return v;
            };
            const computedCells = offsets.map((off, idx) => avoidTrailingFive(clamp(base + off), idx));
            setCellVoltages(computedCells);

            setHistoryData(prev => ({
              battery: [...prev.battery.slice(-14), { time: timestamp, value: batteryVal }],
              current: [...prev.current.slice(-14), { time: timestamp, value: currentVal }],
              voltage: [...prev.voltage.slice(-14), { time: timestamp, value: voltageVal }],
              cell1: [...prev.cell1.slice(-14), { time: timestamp, value: computedCells[0] }],
              cell2: [...prev.cell2.slice(-14), { time: timestamp, value: computedCells[1] }],
              cell3: [...prev.cell3.slice(-14), { time: timestamp, value: computedCells[2] }],
              cell4: [...prev.cell4.slice(-14), { time: timestamp, value: computedCells[3] }],
              cell5: [...prev.cell5.slice(-14), { time: timestamp, value: computedCells[4] }],
              cell6: [...prev.cell6.slice(-14), { time: timestamp, value: computedCells[5] }],
            }));
          } else {
            // Freeze cells; still log other metrics
            setHistoryData(prev => ({
              battery: [...prev.battery.slice(-14), { time: timestamp, value: batteryVal }],
              current: [...prev.current.slice(-14), { time: timestamp, value: currentVal }],
              voltage: [...prev.voltage.slice(-14), { time: timestamp, value: voltageVal }],
              cell1: prev.cell1,
              cell2: prev.cell2,
              cell3: prev.cell3,
              cell4: prev.cell4,
              cell5: prev.cell5,
              cell6: prev.cell6,
            }));
          }
        } else {
          // Update only power-related fields, keep other values frozen
          setData(prev => ({
            ...prev,
            PowerSupply: val.PowerSupply,
            Motor: "OFF"
          }));
          // Reset cells to 0 so when power resumes they animate from zero
          setCellVoltages([0, 0, 0, 0, 0, 0]);
          // Reset trackers so next ON starts from initial
          lastCV.current = { current: 0, voltage: 0, initialized: false };
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const MetricCard = ({ title, value, unit, icon, borderColor }) => (
    <div className="metric-card" style={{ borderColor: borderColor }}>
      <div className="card-icon" style={{ color: borderColor }}>{icon}</div>
      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <div className="card-value">
          {value || "0"}
          {unit && <span className="card-unit">{unit}</span>}
        </div>
      </div>
    </div>
  );

  const BatteryCell = ({ cellNumber, voltage, borderColor }) => {
    const cellVoltage = parseFloat(voltage) || 0;
    const percentage = ((cellVoltage - 1.0) / 0.5) * 100; // 1.0V = 0%, 1.5V = 100%
    const clampedPercentage = Math.max(0, Math.min(100, percentage));

    return (
      <div className="battery-cell" style={{ borderColor: borderColor }}>
        <div className="cell-header">
          <span className="cell-number">Cell {cellNumber}</span>
          <span className="cell-voltage" style={{ color: borderColor }}>
            {cellVoltage.toFixed(3)}V
          </span>
        </div>
        <div className="cell-bar">
          <div
            className="cell-fill"
            style={{ width: `${clampedPercentage}%`, backgroundColor: borderColor }}
          ></div>
        </div>
        <div className="cell-range">
          <span>1.0V</span>
          <span>1.5V</span>
        </div>
      </div>
    );
  };

  const SimpleChart = ({ data, title, color, unit = "" }) => (
    <div className="chart-card" style={{ borderColor: color }}>
      <h3 className="chart-title">{title}</h3>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="time" 
            stroke="#666" 
            fontSize={10}
            tick={{ fill: '#666' }}
          />
          <YAxis 
            stroke="#666" 
            fontSize={10}
            tick={{ fill: '#666' }}
            width={45}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: `2px solid ${color}`, 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            fill={`url(#grad-${title})`}
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <div className="chart-current" style={{ color: color }}>
          {`Current: ${unit === 'V' ? data[data.length - 1].value.toFixed(3) : data[data.length - 1].value.toFixed(2)} ${unit}`}
        </div>
      )}
    </div>
  );
  const motorStatus = data.Motor || "OFF";
  const isMotorOn = motorStatus.toUpperCase() === "ON" || motorStatus === "1";

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <span className="logo">♻️</span>
            <div>
              <h1>Waste Vegetables to Electricity Generation System</h1>
              <p className="subtitle">Real-time Conversion Dashboard</p>
            </div>
          </div>
          <div className="header-right">
            <div className={`status-badge ${isPowerOn ? 'power-on' : 'power-off'}`}>
              <span className="status-dot"></span>
              Power Supply: {isPowerOn ? "ON" : "OFF"}
            </div>
            <div className={`status-badge ${isMotorOn ? 'motor-on' : 'motor-off'}`}>
              <span className="status-dot"></span>
              Motor: {isMotorOn ? "ACTIVE" : "IDLE"}
            </div>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Power Supply Warning */}
        {!isPowerOn && (
          <div className="warning-banner">
            ⚠️ Power Supply is OFF - Data updates are paused
          </div>
        )}

        {/* Main Metrics */}
        <section className="section">
          <h2 className="section-title">System Metrics</h2>
          <div className="metrics-grid">
            <MetricCard
              title="Battery Level"
              value={data.Battery}
              unit="%"
              icon="🔋"
              borderColor="#4CAF50"
            />
            <MetricCard
              title="Current"
              value={data.Current}
              unit="A"
              icon="⚡"
              borderColor="#FF9800"
            />
            <MetricCard
              title="Voltage"
              value={data.Voltage}
              unit="V"
              icon="🔌"
              borderColor="#2196F3"
            />
            <MetricCard
              title="Motor Status"
              value={motorStatus}
              icon="⚙️"
              borderColor="#9C27B0"
            />
          </div>
        </section>

        {/* Battery Cells */}
        <section className="section">
          <h2 className="section-title">Battery Cells (1.0V - 1.5V)</h2>
          <div className="cells-grid">
            <BatteryCell cellNumber={1} voltage={cellVoltages[0]} borderColor="#E91E63" />
            <BatteryCell cellNumber={2} voltage={cellVoltages[1]} borderColor="#9C27B0" />
            <BatteryCell cellNumber={3} voltage={cellVoltages[2]} borderColor="#673AB7" />
            <BatteryCell cellNumber={4} voltage={cellVoltages[3]} borderColor="#3F51B5" />
            <BatteryCell cellNumber={5} voltage={cellVoltages[4]} borderColor="#2196F3" />
            <BatteryCell cellNumber={6} voltage={cellVoltages[5]} borderColor="#00BCD4" />
          </div>
        </section>

        {/* Charts */}
        <section className="section">
          <h2 className="section-title">Real-time Trends</h2>
          <div className="charts-grid">
            <SimpleChart 
              data={historyData.battery} 
              title="Battery Level" 
              color="#4CAF50"
              unit="%"
            />
            <SimpleChart 
              data={historyData.current} 
              title="Current Draw" 
              color="#FF9800"
              unit="A"
            />
            <SimpleChart 
              data={historyData.voltage} 
              title="Voltage" 
              color="#2196F3"
              unit="V"
            />
          </div>
        </section>

        {/* Cell Trends */}
        <section className="section">
          <h2 className="section-title">Cell Voltage Trends</h2>
          <div className="charts-grid-small">
            <SimpleChart data={historyData.cell1} title="Cell 1" color="#E91E63" unit="V" />
            <SimpleChart data={historyData.cell2} title="Cell 2" color="#9C27B0" unit="V" />
            <SimpleChart data={historyData.cell3} title="Cell 3" color="#673AB7" unit="V" />
            <SimpleChart data={historyData.cell4} title="Cell 4" color="#3F51B5" unit="V" />
            <SimpleChart data={historyData.cell5} title="Cell 5" color="#2196F3" unit="V" />
            <SimpleChart data={historyData.cell6} title="Cell 6" color="#00BCD4" unit="V" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;