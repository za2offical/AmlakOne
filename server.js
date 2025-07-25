const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable JSON parsing for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public3D directory
app.use(express.static(path.join(__dirname, 'public3D')));

// API endpoint for uploading custom JSON data
app.post('/api/upload-json', (req, res) => {
    try {
        const { jsonData } = req.body;

        if (!jsonData) {
            return res.status(400).json({ 
                success: false, 
                message: 'No JSON data provided' 
            });
        }

        // Validate JSON structure
        if (!jsonData.walls || !Array.isArray(jsonData.walls)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid JSON format: walls array required' 
            });
        }

        res.json({ 
            success: true, 
            message: 'JSON data received successfully',
            data: jsonData
        });
    } catch (error) {
        console.error('Error processing JSON upload:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error processing JSON data' 
        });
    }
});

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public3D', 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🏠 3D House Viewer running at http://localhost:${PORT}`);
    console.log('🌐 Server accessible on all network interfaces');
    console.log('📁 Serving static files from public3D/ directory');
});

