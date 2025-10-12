import express from 'express';
import bodyParser from 'body-parser';
import routes from './routes';
import { config } from './config'; // Reusing the same configuration

const app = express();
const API_PORT = 3000;

app.use(bodyParser.json());

// API Routes (versioned)
app.use('/api/v1', routes);

// Simple health check route
app.get('/', (req, res) => {
    res.status(200).json({ 
        service: "Cron Service API", 
        status: "Running", 
        dbHost: config.db.host,
        queueName: config.queueName
    });
});


app.listen(API_PORT, () => {
    console.log(`\n--- CRON SERVICE API STARTED ---`);
    console.log(`API Server running on http://localhost:${API_PORT}`);
    console.log(`Endpoints available at http://localhost:${API_PORT}/api/v1`);
});