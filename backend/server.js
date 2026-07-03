const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios'); // Added cleanly for ML Microservice API operations

const app = express();

// 1. Hardened Express CORS implementation to handle standard HTTP requests and preflights
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: true
}));

const server = http.createServer(app);

// 2. Explicitly mapped origin boundaries to bypass multi-port browser blocking matrices
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Centralized System State (In-Memory Source of Truth)
let state = {
    queue: [],              // Array of patient objects: { id, name, tokenNumber, severity, mlPredictedWait }
    currentToken: null,     // The token currently being treated
    tokenCounter: 1,        // Auto-incrementing token generator
    avgConsultTime: 15,     // Dynamic variable handled by receptionist (in minutes)
    totalServed: 0,         // Cumulative counter for analytics metric
    peakVolume: 0           // Tracks peak crowd boundary dynamically
};

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send the instant absolute state the moment a client opens the tab
    socket.emit('STATE_UPDATE', state);

    // Action: Add Patient to Queue with Live ML Inference Pipeline
    socket.on('ADD_PATIENT', async (data) => {
        if (!data.name || data.name.trim() === "") return;
        
        // Simulating an AI Triage classification engine allocation
        const severities = ["Routine", "Urgent", "Critical"]; // Mapped explicitly to match Python internal indices (0, 1, 2)
        const severityIdx = Math.floor(Math.random() * severities.length);
        const randomSeverity = severities[severityIdx];
        
        // Determine peak hour status dynamically
        const currentHour = new Date().getHours();
        const isPeakHour = (currentHour >= 9 && currentHour <= 12) || (currentHour >= 17 && currentHour <= 20) ? 1 : 0;

        let predictedWait = (state.queue.length + 1) * state.avgConsultTime; // Fallback calculation standard

        try {
            // Dispatches full structural inference request to local Python brain on port 8000
            const mlResponse = await axios.post('http://127.0.0.1:8000/predict', {
                triage_level: severityIdx,
                queue_length: state.queue.length,
                peak_hour: isPeakHour
            });
            predictedWait = mlResponse.data.predicted_wait_time_mins;
            console.log(`🧠 ML Predicted Wait Time for ${data.name}: ${predictedWait} mins`);
        } catch (err) {
            console.log("⚠️ ML Microservice offline, deploying architectural fallback standard calculations.");
        }
        
        const newPatient = {
            id: Date.now().toString(),
            name: data.name.trim(),
            tokenNumber: state.tokenCounter++,
            severity: randomSeverity, // Appending triage metadata
            mlPredictedWait: predictedWait // Injected directly into state token frame
        };
        
        state.queue.push(newPatient);
        
        // Dynamically compute and adjust Peak Crowd Volume metric
        if (state.queue.length > state.peakVolume) {
            state.peakVolume = state.queue.length;
        }
        
        // Broadcast structural update to everyone instantly
        io.emit('STATE_UPDATE', state);
    });

    // Action handler: Bulk populate mock patients with automated batch model simulation
    socket.on('MOCK_DATA', async () => {
        const mockPatients = [
            { name: "Adhithya Kumar", severity: "Critical", triageIdx: 2 },
            { name: "Priya Sharma", severity: "Urgent", triageIdx: 1 },
            { name: "Rahul Dravid", severity: "Routine", triageIdx: 0 },
            { name: "Sneha Reddy", severity: "Urgent", triageIdx: 1 },
            { name: "Vikram Seth", severity: "Routine", triageIdx: 0 }
        ];

        const currentHour = new Date().getHours();
        const isPeakHour = (currentHour >= 9 && currentHour <= 12) || (currentHour >= 17 && currentHour <= 20) ? 1 : 0;
        
        // Loop through each mock dataset item using sequential promises to preserve accurate array lengths for the model
        for (let i = 0; i < mockPatients.length; i++) {
            const item = mockPatients[i];
            let predictedWait = (state.queue.length + 1) * state.avgConsultTime;

            try {
                const mlResponse = await axios.post('http://127.0.0.1:8000/predict', {
                    triage_level: item.triageIdx,
                    queue_length: state.queue.length,
                    peak_hour: isPeakHour
                });
                predictedWait = mlResponse.data.predicted_wait_time_mins;
            } catch (err) {
                // Inline logic calculation fallback if microservice connection breaks mid-stream
                predictedWait = Math.max(1, Math.round(10 + (state.queue.length * 12) + (isPeakHour * 8) - (item.triageIdx * 3)));
            }

            const mockPatient = {
                id: (Date.now() + Math.random()).toString(), // Unique ID generation
                name: item.name,
                tokenNumber: state.tokenCounter++,
                severity: item.severity, // Match designated test case severity
                mlPredictedWait: predictedWait
            };
            state.queue.push(mockPatient);
        }

        // Recalculate peak metrics boundary following bulk dump
        if (state.queue.length > state.peakVolume) {
            state.peakVolume = state.queue.length;
        }

        io.emit('STATE_UPDATE', state); // Broadcast the populated queue globally instantly
    });

    // Action: Call Next Patient (Concurrency protected via atomic .shift())
    socket.on('CALL_NEXT', () => {
        if (state.queue.length > 0) {
            state.currentToken = state.queue.shift(); // Atomic extraction
            state.totalServed++; // Safely increment cumulative throughput tally counter
        } else {
            state.currentToken = null; // Queue is empty
        }
        io.emit('STATE_UPDATE', state);
    });

    // Action: Update Avg Consultation Time
    socket.on('UPDATE_CONSULT_TIME', (time) => {
        const parsedTime = parseInt(time);
        if (!isNaN(parsedTime) && parsedTime > 0) {
            state.avgConsultTime = parsedTime;
            io.emit('STATE_UPDATE', state);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Queue Engine running securely on port ${PORT}`);
});