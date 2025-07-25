
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Enable JSON parsing for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public3D directory
app.use(express.static(path.join(__dirname, 'public3D')));

// Function to get available JSON files
function getAvailableJsonFiles() {
    const dataDir = path.join(__dirname, 'public3D', 'data');
    try {
        const files = fs.readdirSync(dataDir);
        return files
            .filter(file => file.endsWith('.json') && file !== 'home.json')
            .map(file => {
                const name = file.replace('.json', '');
                const parts = name.split('-');
                if (parts.length >= 2) {
                    return {
                        filename: file,
                        name: parts[0],
                        id: parts.slice(1).join('-'),
                        route: `${parts[0]}/${parts.slice(1).join('-')}`
                    };
                }
                return null;
            })
            .filter(item => item !== null);
    } catch (error) {
        console.error('Error reading data directory:', error);
        return [];
    }
}

// API endpoint to get list of available projects
app.get('/api/projects', (req, res) => {
    const projects = getAvailableJsonFiles();
    res.json({
        success: true,
        projects: projects
    });
});

// API endpoint to get specific project data
app.get('/api/project/:name/:id', (req, res) => {
    const { name, id } = req.params;
    const filename = `${name}-${id}.json`;
    const filePath = path.join(__dirname, 'public3D', 'data', filename);
    
    console.log(`🔍 API Request for project: ${name}/${id}`);
    console.log(`📁 Looking for file: ${filePath}`);
    console.log(`📄 File exists: ${fs.existsSync(filePath)}`);
    
    // Set content type header
    res.setHeader('Content-Type', 'application/json');
    
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${filename}`);
            const availableFiles = getAvailableJsonFiles().map(p => p.filename);
            console.log(`📋 Available files: ${availableFiles.join(', ')}`);
            
            return res.status(404).json({
                success: false,
                message: `Project not found: ${filename}`,
                requestedPath: filePath,
                availableFiles: availableFiles
            });
        }
        
        const rawData = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(rawData);
        console.log(`✅ Successfully loaded project data for: ${filename}`);
        console.log(`📊 Data contains: ${Object.keys(jsonData).join(', ')}`);
        
        const response = {
            success: true,
            data: jsonData,
            projectInfo: {
                name: name,
                id: id,
                filename: filename,
                loadedAt: new Date().toISOString()
            }
        };
        
        res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ Error loading project data:', error);
        res.status(500).json({
            success: false,
            message: 'Error loading project data',
            error: error.message,
            filename: filename
        });
    }
});

// Dynamic route for project viewing
app.get('/:name/:id', (req, res) => {
    const { name, id } = req.params;
    
    // Skip API routes and debug routes
    if (name === 'api' || name === 'debug' || name === 'health') {
        return res.status(404).send('Not Found');
    }
    
    const filename = `${name}-${id}.json`;
    const filePath = path.join(__dirname, 'public3D', 'data', filename);
    
    console.log(`🔍 Route request for: ${name}/${id}`);
    console.log(`📁 Looking for file: ${filePath}`);
    console.log(`📄 File exists: ${fs.existsSync(filePath)}`);
    
    // Check if the JSON file exists
    if (fs.existsSync(filePath)) {
        // Serve the main HTML file with project info
        res.sendFile(path.join(__dirname, 'public3D', 'index.html'));
    } else {
        res.status(404).send(`
            <html>
                <head><title>Project Not Found</title></head>
                <body>
                    <h1>Project Not Found</h1>
                    <p>The project ${name}/${id} was not found.</p>
                    <p>Available projects:</p>
                    <ul>
                        ${getAvailableJsonFiles().map(p => `<li><a href="/${p.route}">${p.name}/${p.id}</a></li>`).join('')}
                    </ul>
                    <a href="/">Back to Home</a>
                </body>
            </html>
        `);
    }
});

// Root route - show available projects
app.get('/', (req, res) => {
    const projects = getAvailableJsonFiles();
    const projectLinks = projects.map(project => 
        `<li><a href="/${project.route}">${project.name} - ${project.id}</a> (${project.filename})</li>`
    ).join('');
    
    res.send(`
        <html>
            <head>
                <title>3D House Viewer - Available Projects</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #333; }
                    ul { list-style-type: none; padding: 0; }
                    li { margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                    a { text-decoration: none; color: #007bff; font-weight: bold; }
                    a:hover { color: #0056b3; }
                    .info { background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <h1>🏠 3D House Viewer - Available Projects</h1>
                <div class="info">
                    <p>Available projects found in /public3D/data/ directory:</p>
                    <p><strong>Total Projects:</strong> ${projects.length}</p>
                </div>
                <ul>
                    ${projectLinks}
                </ul>
                ${projects.length === 0 ? '<p>No JSON project files found. Please add JSON files in format: Name-ID.json (e.g., Ali-82737388.json)</p>' : ''}
                <hr>
                <p><em>Server running on port ${PORT}</em></p>
            </body>
        </html>
    `);
});

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

// Debug endpoint to check what files exist
app.get('/debug/files', (req, res) => {
    const dataDir = path.join(__dirname, 'public3D', 'data');
    try {
        const files = fs.readdirSync(dataDir);
        res.json({
            success: true,
            dataDirectory: dataDir,
            files: files,
            jsonFiles: files.filter(f => f.endsWith('.json')),
            availableProjects: getAvailableJsonFiles()
        });
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            dataDirectory: dataDir
        });
    }
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
    console.log(`🏠 3D House Viewer running at http://0.0.0.0:${PORT}`);
    console.log('🌐 Server accessible on all network interfaces');
    console.log('📁 Serving static files from public3D/ directory');
    console.log('📊 Available projects:', getAvailableJsonFiles().length);
    console.log('🔗 Access your app at: https://your-repl-name.your-username.repl.co');
});
