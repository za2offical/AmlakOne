import { FloorDetector } from './floor.js';

console.log('✅ WallReader module loaded successfully');

export class WallReader {
    constructor() {
        this.walls = [];
        this.doors = [];
        this.windows = [];
        this.rooms = [];
        this.floorDetector = new FloorDetector();
        
        // Optimized scaling and dimensions
        this.gridSize = 10;
        this.wallHeight = 2.5;
        this.wallThickness = 0.15;
        this.doorWidth = 1.0;
        this.doorHeight = 2.2;
        this.windowWidth = 1.2;
        this.windowHeight = 1.2;
        this.scale = 0.024; // Double scale for better visibility
        
        console.log('📖 WallReader initialized with optimized parameters');
    }

    // Enhanced JSON data processing
    processCustomData(jsonData) {
        try {
            console.log('🔄 Processing custom JSON data:', jsonData);

            // Extract metadata with fallbacks
            this.gridSize = jsonData.metadata?.gridSize || this.gridSize;
            const snapDistance = jsonData.metadata?.snapDistance || 20;
            const precision = jsonData.metadata?.precision || 4;

            console.log(`⚙️ Using scale: ${this.scale}, grid: ${this.gridSize}`);

            // Process walls with enhanced accuracy
            this.processWallsWithAccuracy(jsonData.walls || []);

            // Process doors and windows with precise wall matching
            this.processDoorsWithPrecision(jsonData.doors || []);
            this.processWindowsWithPrecision(jsonData.windows || []);

            // Enhanced floor detection using all available data
            const floorData = this.floorDetector.detectInteriorSpaces(
                jsonData.walls || [], 
                jsonData.doors || [], 
                jsonData.windows || []
            );

            this.rooms = floorData.rooms;

            const result = {
                walls: this.walls,
                doors: this.doors,
                windows: this.windows,
                rooms: this.rooms,
                floorMeshes: floorData.floorMeshes,
                metadata: this.getEnhancedMetadata(),
            };

            console.log('✅ Data processing completed successfully:', {
                walls: this.walls.length,
                doors: this.doors.length,
                windows: this.windows.length,
                rooms: this.rooms.length
            });

            return result;
        } catch (error) {
            console.error('❌ Error processing custom data:', error);
            return null;
        }
    }

    // Load wall data from JSON file
    async loadWallData(jsonPath = "/data/home.json") {
        try {
            console.log(`📁 Loading data from: ${jsonPath}`);
            const response = await fetch(jsonPath);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📄 JSON file loaded successfully');
            return this.processCustomData(data);
        } catch (error) {
            console.error('❌ Error loading JSON file:', error);
            return null;
        }
    }

    // Enhanced coordinate conversion with better precision
    convertTo3D(x2d, y2d) {
        const centerX = this.calculateCenterX();
        const centerY = this.calculateCenterY();

        const result = {
            x: (x2d - centerX) * this.scale,
            z: -(y2d - centerY) * this.scale,
            y: this.wallHeight / 2,
        };

        return result;
    }

    // Dynamic center calculation based on actual data bounds
    calculateCenterX() {
        if (this.walls.length === 0) return 900; // Fallback center

        const xCoords = [];
        this.walls.forEach(wall => {
            if (wall.start2D && wall.end2D) {
                xCoords.push(wall.start2D.x, wall.end2D.x);
            } else {
                // Handle raw wall data
                xCoords.push(wall.x1 || 0, wall.x2 || 0);
            }
        });

        if (xCoords.length === 0) return 900;

        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const centerX = (minX + maxX) / 2;
        
        console.log(`📐 Center X calculated: ${centerX} (range: ${minX} to ${maxX})`);
        return centerX;
    }

    calculateCenterY() {
        if (this.walls.length === 0) return 330; // Fallback center

        const yCoords = [];
        this.walls.forEach(wall => {
            if (wall.start2D && wall.end2D) {
                yCoords.push(wall.start2D.y, wall.end2D.y);
            } else {
                // Handle raw wall data
                yCoords.push(wall.y1 || 0, wall.y2 || 0);
            }
        });

        if (yCoords.length === 0) return 330;

        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        const centerY = (minY + maxY) / 2;
        
        console.log(`📐 Center Y calculated: ${centerY} (range: ${minY} to ${maxY})`);
        return centerY;
    }

    // Enhanced wall processing with better type detection
    processWallsWithAccuracy(wallsData) {
        console.log(`🧱 Processing ${wallsData.length} walls...`);
        
        this.walls = wallsData.map((wall, index) => {
            // Convert coordinates
            const start3D = this.convertTo3D(wall.x1, wall.y1);
            const end3D = this.convertTo3D(wall.x2, wall.y2);

            // Calculate precise dimensions
            const length = Math.sqrt(
                Math.pow(end3D.x - start3D.x, 2) +
                Math.pow(end3D.z - start3D.z, 2)
            );

            const angle = Math.atan2(end3D.z - start3D.z, end3D.x - start3D.x);

            const centerPosition = {
                x: (start3D.x + end3D.x) / 2,
                y: start3D.y,
                z: (start3D.z + end3D.z) / 2,
            };

            // Enhanced wall type detection
            const wallType = this.determineWallTypeAccurate(wall, index, wallsData);

            const processedWall = {
                id: index,
                start2D: { x: wall.x1, y: wall.y1 },
                end2D: { x: wall.x2, y: wall.y2 },
                start3D: start3D,
                end3D: end3D,
                center3D: centerPosition,
                length: length,
                angle: angle,
                rotation: { x: 0, y: angle, z: 0 },
                dimensions: {
                    width: length,
                    height: this.wallHeight,
                    depth: this.wallThickness,
                },
                type: wallType,
                hasDoor: false,
                hasWindow: false,
            };

            if (index < 5) { // Log first few walls for debugging
                console.log(`🧱 Wall ${index}:`, {
                    start2D: processedWall.start2D,
                    end2D: processedWall.end2D,
                    center3D: processedWall.center3D,
                    length: length.toFixed(2),
                    type: wallType.type
                });
            }

            return processedWall;
        });

        console.log(`✅ Processed ${this.walls.length} walls successfully`);
    }

    // Improved wall type detection
    determineWallTypeAccurate(wall, index, allWalls) {
        const length2D = Math.sqrt(
            Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2)
        );

        const isExterior = this.isExteriorWallAccurate(wall, allWalls);

        return {
            type: isExterior ? "exterior" : "interior",
            hasDoor: false,
            hasWindow: false,
            doorPosition: null,
            windowCount: 0,
            length2D: length2D,
            confidence: this.calculateWallTypeConfidence(wall, allWalls)
        };
    }

    // Enhanced exterior wall detection
    isExteriorWallAccurate(wall, allWalls) {
        const length2D = Math.sqrt(
            Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2)
        );

        // Longer walls are more likely to be exterior
        if (length2D > 250) return true;

        // Calculate boundary proximity
        const allX = allWalls.flatMap(w => [w.x1, w.x2]);
        const allY = allWalls.flatMap(w => [w.y1, w.y2]);
        const bounds = {
            minX: Math.min(...allX),
            maxX: Math.max(...allX),
            minY: Math.min(...allY),
            maxY: Math.max(...allY)
        };

        const tolerance = 15; // Reduced tolerance for better accuracy

        const isNearBoundary = (
            Math.abs(wall.x1 - bounds.minX) < tolerance || 
            Math.abs(wall.x1 - bounds.maxX) < tolerance ||
            Math.abs(wall.y1 - bounds.minY) < tolerance || 
            Math.abs(wall.y1 - bounds.maxY) < tolerance ||
            Math.abs(wall.x2 - bounds.minX) < tolerance || 
            Math.abs(wall.x2 - bounds.maxX) < tolerance ||
            Math.abs(wall.y2 - bounds.minY) < tolerance || 
            Math.abs(wall.y2 - bounds.maxY) < tolerance
        );

        return isNearBoundary;
    }

    calculateWallTypeConfidence(wall, allWalls) {
        // Calculate confidence score for wall type classification
        let confidence = 0.5; // Base confidence
        
        const length2D = Math.sqrt(
            Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2)
        );
        
        // Longer walls get higher confidence for being exterior
        if (length2D > 300) confidence += 0.3;
        else if (length2D < 100) confidence -= 0.2;
        
        return Math.max(0.1, Math.min(0.9, confidence));
    }

    // Precise door processing with enhanced wall matching
    processDoorsWithPrecision(doorsData) {
        console.log(`🚪 Processing ${doorsData.length} doors...`);
        
        this.doors = doorsData.map((door, index) => {
            const position3D = this.convertTo3D(door.x, door.y);
            const relatedWall = this.findWallByPositionAccurate(door.x, door.y);

            const processedDoor = {
                id: index,
                position2D: { x: door.x, y: door.y },
                position3D: {
                    x: position3D.x,
                    y: this.doorHeight / 2 - 1.3, // Adjusted for better positioning
                    z: position3D.z,
                },
                dimensions: {
                    width: this.doorWidth,
                    height: this.doorHeight,
                    depth: this.wallThickness * 1.2,
                },
                type: door.type || 'door',
                wallId: door.wallId,
                relatedWall: relatedWall,
                rotation: relatedWall ? relatedWall.rotation : { x: 0, y: 0, z: 0 },
                timestamp: door.timestamp
            };

            if (relatedWall) {
                relatedWall.hasDoor = true;
                console.log(`🚪 Door ${index} matched to wall ${relatedWall.id}`);
            } else {
                console.warn(`🚪 Door ${index} could not find matching wall`);
            }

            return processedDoor;
        });

        console.log(`✅ Processed ${this.doors.length} doors successfully`);
    }

    // Precise window processing with enhanced wall matching
    processWindowsWithPrecision(windowsData) {
        console.log(`🪟 Processing ${windowsData.length} windows...`);
        
        this.windows = windowsData.map((window, index) => {
            const position3D = this.convertTo3D(window.x, window.y);
            const relatedWall = this.findWallByPositionAccurate(window.x, window.y);

            const processedWindow = {
                id: index,
                position2D: { x: window.x, y: window.y },
                position3D: {
                    x: position3D.x,
                    y: 1.3, // Optimized window height
                    z: position3D.z,
                },
                dimensions: {
                    width: this.windowWidth,
                    height: this.windowHeight,
                    depth: this.wallThickness,
                },
                type: window.type || 'window',
                wallId: window.wallId,
                relatedWall: relatedWall,
                rotation: relatedWall ? relatedWall.rotation : { x: 0, y: 0, z: 0 },
                timestamp: window.timestamp
            };

            if (relatedWall) {
                relatedWall.hasWindow = true;
                relatedWall.windowCount = (relatedWall.windowCount || 0) + 1;
                console.log(`🪟 Window ${index} matched to wall ${relatedWall.id}`);
            } else {
                console.warn(`🪟 Window ${index} could not find matching wall`);
            }

            return processedWindow;
        });

        console.log(`✅ Processed ${this.windows.length} windows successfully`);
    }

    // Enhanced wall finding with improved accuracy
    findWallByPositionAccurate(x, y) {
        let closestWall = null;
        let minDistance = Infinity;
        const maxTolerance = 40; // Reduced tolerance for better precision

        this.walls.forEach((wall, index) => {
            const distance = this.pointToLineDistanceAccurate(
                { x: x, y: y },
                wall.start2D,
                wall.end2D
            );

            // Additional check for point being on the line segment
            const isOnSegment = this.isPointOnLineSegment(
                { x: x, y: y },
                wall.start2D,
                wall.end2D,
                maxTolerance
            );

            if (distance < minDistance && distance < maxTolerance && isOnSegment) {
                minDistance = distance;
                closestWall = { ...wall, id: index, distance: distance };
            }
        });

        if (closestWall) {
            console.log(`📍 Found wall at distance ${closestWall.distance.toFixed(2)} for point (${x}, ${y})`);
        }

        return closestWall;
    }

    // Enhanced point-to-line distance calculation
    pointToLineDistanceAccurate(point, lineStart, lineEnd) {
        const A = point.x - lineStart.x;
        const B = point.y - lineStart.y;
        const C = lineEnd.x - lineStart.x;
        const D = lineEnd.y - lineStart.y;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return Math.sqrt(A * A + B * B);

        let param = dot / lenSq;
        param = Math.max(0, Math.min(1, param));

        const xx = lineStart.x + param * C;
        const yy = lineStart.y + param * D;

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if point is on line segment within tolerance
    isPointOnLineSegment(point, lineStart, lineEnd, tolerance) {
        // Calculate the perpendicular distance
        const distance = this.pointToLineDistanceAccurate(point, lineStart, lineEnd);
        
        if (distance > tolerance) return false;

        // Check if point is within the line segment bounds
        const minX = Math.min(lineStart.x, lineEnd.x) - tolerance;
        const maxX = Math.max(lineStart.x, lineEnd.x) + tolerance;
        const minY = Math.min(lineStart.y, lineEnd.y) - tolerance;
        const maxY = Math.max(lineStart.y, lineEnd.y) + tolerance;

        return point.x >= minX && point.x <= maxX && 
               point.y >= minY && point.y <= maxY;
    }

    // Enhanced metadata generation
    getEnhancedMetadata() {
        const bounds = this.calculateBounds();
        const exteriorWalls = this.walls.filter((w) => w.type.type === "exterior");
        const interiorWalls = this.walls.filter((w) => w.type.type === "interior");

        return {
            totalWalls: this.walls.length,
            totalRooms: this.rooms.length,
            exteriorWalls: exteriorWalls.length,
            interiorWalls: interiorWalls.length,
            totalDoors: this.doors.length,
            totalWindows: this.windows.length,
            totalFloorArea: this.rooms.reduce((sum, r) => sum + (r.area || 0), 0),
            scale: this.scale,
            wallHeight: this.wallHeight,
            wallThickness: this.wallThickness,
            bounds: bounds,
            averageWallLength: this.walls.length > 0 ? 
                this.walls.reduce((sum, w) => sum + w.length, 0) / this.walls.length : 0,
            processingTimestamp: new Date().toISOString()
        };
    }

    calculateBounds() {
        if (this.walls.length === 0) {
            return {
                minX: 0, maxX: 1600, minY: 0, maxY: 800,
                centerX: 800, centerY: 400,
                width: 1600, height: 800
            };
        }

        const allX = this.walls.flatMap(w => [w.start2D.x, w.end2D.x]);
        const allY = this.walls.flatMap(w => [w.start2D.y, w.end2D.y]);

        const bounds = {
            minX: Math.min(...allX),
            maxX: Math.max(...allX),
            minY: Math.min(...allY),
            maxY: Math.max(...allY)
        };

        bounds.centerX = (bounds.minX + bounds.maxX) / 2;
        bounds.centerY = (bounds.minY + bounds.maxY) / 2;
        bounds.width = bounds.maxX - bounds.minX;
        bounds.height = bounds.maxY - bounds.minY;

        console.log('📏 Calculated bounds:', bounds);
        return bounds;
    }

    // Accessor methods
    getWalls3D() {
        return this.walls;
    }

    getRooms3D() {
        return this.rooms;
    }

    getDoors3D() {
        return this.doors;
    }

    getWindows3D() {
        return this.windows;
    }

    // Utility method for debugging
    logProcessingStats() {
        console.log('📊 Processing Statistics:');
        console.log(`  Walls: ${this.walls.length} (${this.walls.filter(w => w.type.type === 'exterior').length} exterior, ${this.walls.filter(w => w.type.type === 'interior').length} interior)`);
        console.log(`  Doors: ${this.doors.length}`);
        console.log(`  Windows: ${this.windows.length}`);
        console.log(`  Rooms: ${this.rooms.length}`);
        console.log(`  Scale: ${this.scale}`);
        console.log(`  Total Floor Area: ${this.rooms.reduce((sum, r) => sum + (r.area || 0), 0).toFixed(2)} m²`);
    }
}
