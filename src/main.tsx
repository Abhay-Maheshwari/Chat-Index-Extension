import React from 'react'
import ReactDOM from 'react-dom/client'

console.log('Mock Chat App: Starting...');

const MockChat = () => {
    console.log('Mock Chat App: Rendering component...');
    return (
        <div className="chat-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', border: '1px solid #ccc', minHeight: '500px' }}>
            <h1>Mock Chat Interface</h1>
            <div className="message user" style={{ marginBottom: '10px', padding: '10px', background: '#f0f0f0' }}>
                <p>Can you explain IoT and new computing paradigms?</p>
            </div>
            <div className="message ai" style={{ marginBottom: '10px', padding: '10px', background: '#e0f0ff' }}>
                <h1>Module 1 — Internet of Things (IoT) & New Computing Paradigms</h1>
                <p>I'll cover every topic, every concept, and all diagrams, but written in a clear, easy, even-ready way.</p>

                <h2>1. Introduction to IoT</h2>
                <h3>What is IoT?</h3>
                <p>Internet of Things means connecting physical objects (like sensors, appliances, smart devices, vehicles, etc.) to the internet so they can collect, share, and process data automatically.</p>

                <h3>Examples</h3>
                <ul>
                    <li>Smart home lights</li>
                    <li>Fitness trackers</li>
                    <li>CCTV cameras</li>
                    <li>Industrial robots</li>
                    <li>Connected cars</li>
                </ul>

                <h3>Why IoT?</h3>
                <p>IoT improves efficiency, automation, monitoring, and decision-making in sectors like healthcare, agriculture, transport, factories, etc.</p>

                <h2>2. IoT Architecture (Cloud, Centric, IoT = CIoT)</h2>
                <p>IoT systems typically follow a layered architecture:</p>

                <h3>Layer 1: Perception Layer</h3>
                <p>Physical sensors and devices that collect data (temperature, motion, etc.)</p>

                <h3>Layer 2: Network Layer</h3>
                <p>Transmits data from sensors to the cloud or processing units using WiFi, Bluetooth, 4G/5G, etc.</p>

                <h3>Layer 3: Processing Layer</h3>
                <p>Cloud or edge servers analyze and process the data.</p>

                <h3>Layer 4: Application Layer</h3>
                <p>End-user applications (mobile apps, dashboards) that display insights or trigger actions.</p>

                <h2>3. Code Example</h2>
                <p>Here's a simple Python example for reading sensor data:</p>
                <pre><code className="language-python">{`import random
import time

def read_temperature_sensor():
    # Simulate reading from a temperature sensor
    return random.uniform(20.0, 30.0)

while True:
    temp = read_temperature_sensor()
    print(f"Current temperature: {temp:.2f}°C")
    time.sleep(2)`}</code></pre>


                <h2>4. Edge Computing</h2>
                <p>Edge computing processes data closer to where it's generated (at the "edge" of the network) rather than sending everything to the cloud.</p>

                <h3>Benefits</h3>
                <ul>
                    <li>Reduced latency</li>
                    <li>Lower bandwidth usage</li>
                    <li>Better privacy</li>
                    <li>Real-time processing</li>
                </ul>
            </div>
            <div className="message user" style={{ marginBottom: '10px', padding: '10px', background: '#f0f0f0' }}>
                <p>Can you show me a JavaScript example too?</p>
            </div>
            <div className="message ai" style={{ marginBottom: '10px', padding: '10px', background: '#e0f0ff' }}>
                <h2>JavaScript IoT Example</h2>
                <p>Here's how you might handle IoT data in JavaScript:</p>
                <pre><code className="language-javascript">{`class IoTDevice {
    constructor(name, type) {
        this.name = name;
        this.type = type;
        this.data = [];
    }
    
    collectData(value) {
        this.data.push({
            timestamp: new Date(),
            value: value
        });
    }
    
    getLatestReading() {
        return this.data[this.data.length - 1];
    }
}

const tempSensor = new IoTDevice('Living Room', 'temperature');
tempSensor.collectData(22.5);
console.log(tempSensor.getLatestReading());`}</code></pre>

            </div>
        </div>
    )
}

const rootElement = document.getElementById('app');
if (!rootElement) {
    console.error('Mock Chat App: Root element #app not found!');
} else {
    console.log('Mock Chat App: Root element found, mounting React...');
    try {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <MockChat />
            </React.StrictMode>,
        )
        console.log('Mock Chat App: Mount called.');
    } catch (e) {
        console.error('Mock Chat App: Error mounting React:', e);
    }
}
