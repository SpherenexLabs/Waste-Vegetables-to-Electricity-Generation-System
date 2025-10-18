


import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
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
    Battery: "89",
    Current: "1.5",
    Motor: "OFF",
    Voltage: "11.7",
    PowerSupply: "ON", // Power supply status
    Cell1: "1.387",
    Cell2: "1.417",
    Cell3: "1.447",
    Cell4: "1.487",
    Cell5: "1.500",
    Cell6: "1.500"
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
  // Local current simulation state
  const [simulatedCurrent, setSimulatedCurrent] = useState(1.5);
  const [isIncreasing, setIsIncreasing] = useState(true);

  // Effect to simulate current value changes when power is on
  useEffect(() => {
    if (!isPowerOn) return;

    const interval = setInterval(() => {
      setSimulatedCurrent(prevCurrent => {
        const step = 0.1;
        let newCurrent;
        
        if (isIncreasing) {
          newCurrent = prevCurrent + step;
          if (newCurrent >= 2.0) {
            newCurrent = 2.0;
            setIsIncreasing(false);
          }
        } else {
          newCurrent = prevCurrent - step;
          if (newCurrent <= 1.5) {
            newCurrent = 1.5;
            setIsIncreasing(true);
          }
        }
        
        return parseFloat(newCurrent.toFixed(1));
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [isPowerOn, isIncreasing]);

  // Effect to update history when simulated current changes
  useEffect(() => {
    if (isPowerOn && simulatedCurrent !== 1.5) {
      const timestamp = new Date().toLocaleTimeString();
      setHistoryData(prev => ({
        ...prev,
        current: [...prev.current.slice(-14), { time: timestamp, value: simulatedCurrent }],
      }));
    }
  }, [simulatedCurrent, isPowerOn]);

  // Effect to update only the current value in data state - separate from Firebase updates
  useEffect(() => {
    setData(prevData => ({
      ...prevData,
      Current: isPowerOn ? simulatedCurrent.toString() : "0"
    }));
  }, [simulatedCurrent, isPowerOn]);

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
          // Merge Firebase data with existing data, don't override current here
          setData(prevData => ({
            ...prevData,
            ...val,
            Current: prevData.Current // Keep the current value from our simulation
          }));
          
          // Update history for graphs (keep last 15 readings)
          const timestamp = new Date().toLocaleTimeString();
          const batteryVal = parseFloat(val.Battery) || parseFloat(data.Battery) || 89;
          const currentVal = simulatedCurrent; // Use simulated current
          const voltageVal = parseFloat(val.Voltage) || parseFloat(data.Voltage) || 11.7;
          
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
          // Update only power-related fields, keep other values with defaults
          setData(prev => ({
            ...prev,
            PowerSupply: val.PowerSupply || "OFF",
            Motor: "OFF",
            Current: "0", // Reset current when power is off
            Battery: prev.Battery || "89",
            Voltage: prev.Voltage || "11.7"
          }));
          // Reset cells to 0 so when power resumes they animate from zero
          setCellVoltages([0, 0, 0, 0, 0, 0]);
          // Reset trackers so next ON starts from initial
          lastCV.current = { current: 0, voltage: 0, initialized: false };
          // Reset simulated current
          setSimulatedCurrent(1.5);
          setIsIncreasing(true);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const MetricCard = memo(({ title, value, unit, icon, borderColor }) => {
    // Use the passed value directly, no access to simulatedCurrent here
    const displayValue = value || "0";
    
    return (
      <div className="metric-card" style={{ borderColor: borderColor }}>
        <div className="card-icon" style={{ color: borderColor }}>{icon}</div>
        <div className="card-content">
          <h3 className="card-title">{title}</h3>
          <div className="card-value">
            {displayValue}
            {unit && <span className="card-unit">{unit}</span>}
          </div>
        </div>
      </div>
    );
  });

  const BatteryCell = memo(({ cellNumber, voltage, borderColor }) => {
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
  });

  const SimpleChart = memo(({ data, title, color, unit = "" }) => {
    // Create stable chart data - never allow empty charts
    const chartData = useMemo(() => {
      if (data && data.length > 0) {
        return data;
      }
      // Fallback data to prevent empty charts
      const currentTime = new Date().toLocaleTimeString();
      return [
        { time: currentTime, value: 0 }
      ];
    }, [data]);
    
    return (
      <div className="chart-card" style={{ borderColor: color }}>
        <h3 className="chart-title">{title}</h3>
        <div style={{ width: '100%', height: '180px', overflow: 'hidden' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              <defs>
                <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e0e0e0" 
              />
              <XAxis 
                dataKey="time" 
                stroke="#666" 
                fontSize={10}
                tick={{ fill: '#666' }}
                axisLine={{ stroke: '#666' }}
                tickLine={{ stroke: '#666' }}
                hide={false}
              />
              <YAxis 
                stroke="#666" 
                fontSize={10}
                tick={{ fill: '#666' }}
                width={45}
                axisLine={{ stroke: '#666' }}
                tickLine={{ stroke: '#666' }}
                hide={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: `2px solid ${color}`, 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                animationDuration={0}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fill={`url(#grad-${title.replace(/\s+/g, '')})`}
                strokeWidth={2}
                animationDuration={0}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {data && data.length > 0 && (
          <div className="chart-current" style={{ color: color }}>
            {`Current: ${unit === 'V' ? data[data.length - 1].value.toFixed(3) : data[data.length - 1].value.toFixed(2)} ${unit}`}
          </div>
        )}
      </div>
    );
  });
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
              key="battery-chart"
              data={historyData.battery} 
              title="Battery Level" 
              color="#4CAF50"
              unit="%"
            />
            <SimpleChart 
              key="current-chart"
              data={historyData.current} 
              title="Current Draw" 
              color="#FF9800"
              unit="A"
            />
            <SimpleChart 
              key="voltage-chart"
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
            <SimpleChart key="cell1-chart" data={historyData.cell1} title="Cell 1" color="#E91E63" unit="V" />
            <SimpleChart key="cell2-chart" data={historyData.cell2} title="Cell 2" color="#9C27B0" unit="V" />
            <SimpleChart key="cell3-chart" data={historyData.cell3} title="Cell 3" color="#673AB7" unit="V" />
            <SimpleChart key="cell4-chart" data={historyData.cell4} title="Cell 4" color="#3F51B5" unit="V" />
            <SimpleChart key="cell5-chart" data={historyData.cell5} title="Cell 5" color="#2196F3" unit="V" />
            <SimpleChart key="cell6-chart" data={historyData.cell6} title="Cell 6" color="#00BCD4" unit="V" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default App;