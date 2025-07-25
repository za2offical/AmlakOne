export class FloorDetector {
    constructor() {
        this.rooms = [];
        this.floorPolygons = [];
        this.scale = 0.024; // Double scale matching WallReader
        this.floorHeight = 0.1;
        this.tolerance = 8; // Improved tolerance for better accuracy
        this.debugMode = false;
    }

    // Enhanced interior space detection with better algorithms
    detectInteriorSpaces(walls, doors = [], windows = []) {
        console.log('🔍 Starting enhanced interior space detection...');
        console.log(`📊 Input: ${walls.length} walls, ${doors.length} doors, ${windows.length} windows`);

        try {
            // Step 1: Build comprehensive wall network
            const wallNetwork = this.buildWallNetwork(walls);
            
            // Step 2: Find closed polygonal spaces
            const detectedSpaces = this.findClosedSpaces(wallNetwork);
            
            // Step 3: Validate and classify spaces
            const validRooms = this.validateAndClassifyRooms(detectedSpaces, doors, windows);
            
            // Step 4: Generate floor meshes
            const floorMeshes = this.generateOptimizedFloorMeshes(validRooms);
            
            this.rooms = validRooms;
            
            console.log(`✅ Detected ${validRooms.length} interior spaces successfully`);
            
            return {
                rooms: validRooms,
                floorMeshes: floorMeshes,
                debugInfo: this.getDebugInfo()
            };
        } catch (error) {
            console.error('❌ Error in interior space detection:', error);
            return this.createFallbackSpaces(walls);
        }
    }

    buildWallNetwork(walls) {
        const network = {
            nodes: new Map(), // point coordinates -> node info
            edges: [], // wall segments
            adjacency: new Map() // node -> connected nodes
        };

        console.log('🔗 Building wall network...');

        walls.forEach((wall, wallIndex) => {
            const startKey = `${Math.round(wall.x1)},${Math.round(wall.y1)}`;
            const endKey = `${Math.round(wall.x2)},${Math.round(wall.y2)}`;
            
            // Add nodes
            if (!network.nodes.has(startKey)) {
                network.nodes.set(startKey, {
                    x: wall.x1,
                    y: wall.y1,
                    connections: []
                });
                network.adjacency.set(startKey, new Set());
            }
            
            if (!network.nodes.has(endKey)) {
                network.nodes.set(endKey, {
                    x: wall.x2,
                    y: wall.y2,
                    connections: []
                });
                network.adjacency.set(endKey, new Set());
            }
            
            // Add edge
            const edge = {
                wallIndex,
                startKey,
                endKey,
                start: { x: wall.x1, y: wall.y1 },
                end: { x: wall.x2, y: wall.y2 },
                length: Math.sqrt(Math.pow(wall.x2 - wall.x1, 2) + Math.pow(wall.y2 - wall.y1, 2))
            };
            
            network.edges.push(edge);
            
            // Update adjacency
            network.adjacency.get(startKey).add(endKey);
            network.adjacency.get(endKey).add(startKey);
            
            // Update node connections
            network.nodes.get(startKey).connections.push(endKey);
            network.nodes.get(endKey).connections.push(startKey);
        });

        console.log(`🔗 Network built: ${network.nodes.size} nodes, ${network.edges.length} edges`);
        return network;
    }

    findClosedSpaces(network) {
        console.log('🔍 Finding closed polygonal spaces...');
        
        const closedPolygons = [];
        const visited = new Set();
        
        // Use cycle detection to find closed spaces
        for (let startNodeKey of network.nodes.keys()) {
            if (visited.has(startNodeKey)) continue;
            
            const cycles = this.findCyclesFromNode(startNodeKey, network, visited);
            closedPolygons.push(...cycles);
        }
        
        // Remove duplicates and filter by minimum area
        const uniquePolygons = this.removeDuplicatePolygons(closedPolygons);
        const validPolygons = uniquePolygons.filter(poly => this.calculatePolygonArea(poly) > 1000); // Minimum area threshold
        
        console.log(`🔍 Found ${validPolygons.length} valid closed spaces`);
        return validPolygons;
    }

    findCyclesFromNode(startNodeKey, network, globalVisited) {
        const cycles = [];
        const maxDepth = 12; // Prevent infinite loops
        
        const dfs = (currentKey, path, visited, depth) => {
            if (depth > maxDepth) return;
            
            const adjacentNodes = network.adjacency.get(currentKey);
            if (!adjacentNodes) return;
            
            for (let nextKey of adjacentNodes) {
                if (nextKey === startNodeKey && path.length >= 3) {
                    // Found a cycle
                    const cycle = [...path, startNodeKey];
                    const polygon = this.pathToPolygon(cycle, network);
                    if (this.isValidPolygon(polygon)) {
                        cycles.push(polygon);
                    }
                    continue;
                }
                
                if (!visited.has(nextKey) && nextKey !== path[path.length - 2]) {
                    visited.add(nextKey);
                    path.push(nextKey);
                    
                    dfs(nextKey, path, visited, depth + 1);
                    
                    path.pop();
                    visited.delete(nextKey);
                }
            }
        };
        
        const localVisited = new Set([startNodeKey]);
        dfs(startNodeKey, [startNodeKey], localVisited, 0);
        
        cycles.forEach(() => globalVisited.add(startNodeKey));
        return cycles;
    }

    pathToPolygon(path, network) {
        return path.map(nodeKey => {
            const node = network.nodes.get(nodeKey);
            return node ? { x: node.x, y: node.y } : null;
        }).filter(point => point !== null);
    }

    isValidPolygon(polygon) {
        if (polygon.length < 3) return false;
        
        // Check for self-intersection (basic check)
        const area = this.calculatePolygonArea(polygon);
        return area > 500 && area < 1000000; // Reasonable area bounds
    }

    removeDuplicatePolygons(polygons) {
        const unique = [];
        
        for (let poly of polygons) {
            const isUnique = !unique.some(existingPoly => 
                this.polygonsAreEqual(poly, existingPoly)
            );
            
            if (isUnique) {
                unique.push(poly);
            }
        }
        
        return unique;
    }

    polygonsAreEqual(poly1, poly2) {
        if (poly1.length !== poly2.length) return false;
        
        // Sort points by coordinates for comparison
        const sort1 = [...poly1].sort((a, b) => a.x - b.x || a.y - b.y);
        const sort2 = [...poly2].sort((a, b) => a.x - b.x || a.y - b.y);
        
        return sort1.every((point, index) => 
            Math.abs(point.x - sort2[index].x) < this.tolerance &&
            Math.abs(point.y - sort2[index].y) < this.tolerance
        );
    }

    validateAndClassifyRooms(detectedSpaces, doors, windows) {
        console.log('🏠 Validating and classifying rooms...');
        
        const validRooms = detectedSpaces.map((polygon, index) => {
            const area = this.calculatePolygonArea(polygon);
            const center = this.calculatePolygonCenter(polygon);
            const bounds = this.getPolygonBounds(polygon);
            
            // Count doors and windows in this space
            const doorsInRoom = this.countElementsInPolygon(doors, polygon);
            const windowsInRoom = this.countElementsInPolygon(windows, polygon);
            
            const room = {
                id: index,
                name: this.classifyRoom(area, doorsInRoom, windowsInRoom, index),
                polygon: polygon,
                area: area * this.scale * this.scale, // Convert to real area
                center2D: center,
                center3D: this.convertTo3D(center.x, center.y),
                bounds: bounds,
                floorDimensions: this.calculateFloorDimensions(bounds),
                floorPosition: this.calculateFloorPosition(center),
                doorsCount: doorsInRoom,
                windowsCount: windowsInRoom,
                type: this.determineRoomType(area, doorsInRoom, windowsInRoom),
                confidence: this.calculateRoomConfidence(area, polygon)
            };
            
            console.log(`🏠 Room ${index}: ${room.name} (${room.area.toFixed(1)}m², ${room.doorsCount} doors, ${room.windowsCount} windows)`);
            return room;
        });

        return validRooms.filter(room => room.confidence > 0.3);
    }

    countElementsInPolygon(elements, polygon) {
        return elements.filter(element => 
            this.isPointInPolygon({ x: element.x, y: element.y }, polygon)
        ).length;
    }

    isPointInPolygon(point, polygon) {
        let inside = false;
        
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            
            if (((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }

    classifyRoom(area, doorsCount, windowsCount, index) {
        const roomNames = [
            "Living Room", "Master Bedroom", "Kitchen", "Bathroom", 
            "Bedroom", "Study Room", "Dining Room", "Hallway",
            "Guest Room", "Storage Room", "Laundry Room", "Entry"
        ];
        
        const realArea = area * this.scale * this.scale;
        
        // Classification based on area and features
        if (realArea > 30) return "Living Room";
        if (realArea > 20 && windowsCount >= 2) return "Master Bedroom";
        if (realArea > 15 && windowsCount >= 1) return "Bedroom";
        if (realArea > 8 && doorsCount === 0) return "Kitchen";
        if (realArea < 5) return "Bathroom";
        if (realArea > 25) return "Dining Room";
        if (doorsCount >= 2) return "Hallway";
        
        return roomNames[index % roomNames.length] || `Room ${index + 1}`;
    }

    determineRoomType(area, doorsCount, windowsCount) {
        const realArea = area * this.scale * this.scale;
        
        if (realArea < 4) return "bathroom";
        if (realArea > 25) return "living";
        if (windowsCount >= 1 && realArea > 10) return "bedroom";
        if (doorsCount === 0) return "kitchen";
        if (doorsCount >= 2) return "hallway";
        
        return "general";
    }

    calculateRoomConfidence(area, polygon) {
        let confidence = 0.5; // Base confidence
        
        const realArea = area * this.scale * this.scale;
        const aspectRatio = this.calculateAspectRatio(polygon);
        
        // Area-based confidence
        if (realArea > 3 && realArea < 100) confidence += 0.3;
        else confidence -= 0.2;
        
        // Shape-based confidence (prefer rectangular rooms)
        if (aspectRatio > 0.3 && aspectRatio < 3) confidence += 0.2;
        else confidence -= 0.1;
        
        // Polygon regularity
        if (polygon.length >= 4 && polygon.length <= 8) confidence += 0.1;
        
        return Math.max(0.1, Math.min(0.9, confidence));
    }

    calculateAspectRatio(polygon) {
        const bounds = this.getPolygonBounds(polygon);
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        return Math.min(width, height) / Math.max(width, height);
    }

    generateOptimizedFloorMeshes(rooms) {
        console.log('🏗️ Generating optimized floor meshes...');
        
        return rooms.map((room, index) => {
            // Stable color assignment based on room name hash for consistent colors
            const floorColors = [
                0xd4af8c, // Light wood
                0xc8a882, // Medium wood  
                0xdcc299, // Light oak
                0xe6ddb7, // Cream
                0xf0f0f0  // Light gray
            ];
            
            // Create stable color index based on room name
            let colorIndex = 0;
            if (room.name) {
                colorIndex = room.name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % floorColors.length;
            } else {
                colorIndex = room.id % floorColors.length;
            }
            
            return {
                geometry: {
                    type: 'BoxGeometry',
                    width: room.floorDimensions.width,
                    height: room.floorDimensions.height,
                    depth: room.floorDimensions.depth
                },
                material: {
                    type: 'MeshStandardMaterial',
                    color: floorColors[colorIndex],
                    roughness: 0.8,
                    metalness: 0.1,
                    transparent: false,
                    depthWrite: true,
                    depthTest: true
                },
                position: room.floorPosition,
                userData: {
                    roomId: room.id,
                    roomName: room.name,
                    roomType: room.type,
                    area: room.area,
                    confidence: room.confidence,
                    colorIndex: colorIndex
                }
            };
        });
    }

    // Polygon calculation utilities
    calculatePolygonArea(polygon) {
        if (polygon.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < polygon.length; i++) {
            const j = (i + 1) % polygon.length;
            area += polygon[i].x * polygon[j].y;
            area -= polygon[j].x * polygon[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    calculatePolygonCenter(polygon) {
        if (polygon.length === 0) return { x: 0, y: 0 };
        
        let centerX = 0, centerY = 0;
        polygon.forEach(point => {
            centerX += point.x;
            centerY += point.y;
        });

        return {
            x: centerX / polygon.length,
            y: centerY / polygon.length
        };
    }

    getPolygonBounds(polygon) {
        if (polygon.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        polygon.forEach(point => {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        });

        return { minX, maxX, minY, maxY };
    }

    calculateFloorDimensions(bounds) {
        return {
            width: (bounds.maxX - bounds.minX) * this.scale,
            height: this.floorHeight,
            depth: (bounds.maxY - bounds.minY) * this.scale
        };
    }

    calculateFloorPosition(center) {
        const center3D = this.convertTo3D(center.x, center.y);
        return {
            x: center3D.x,
            y: -this.floorHeight / 2,
            z: center3D.z
        };
    }

    // Coordinate conversion
    convertTo3D(x2d, y2d) {
        // Use same conversion as WallReader for consistency
        const centerX = this.calculateCenterX();
        const centerY = this.calculateCenterY();

        return {
            x: (x2d - centerX) * this.scale,
            z: -(y2d - centerY) * this.scale,
            y: 0
        };
    }

    calculateCenterX() {
        if (this.rooms.length === 0) return 900; // Fallback
        
        const allX = this.rooms.flatMap(room => 
            room.polygon?.map(point => point.x) || []
        );
        
        if (allX.length === 0) return 900;
        
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        return (minX + maxX) / 2;
    }

    calculateCenterY() {
        if (this.rooms.length === 0) return 330; // Fallback
        
        const allY = this.rooms.flatMap(room => 
            room.polygon?.map(point => point.y) || []
        );
        
        if (allY.length === 0) return 330;
        
        const minY = Math.min(...allY);
        const maxY = Math.max(...allY);
        return (minY + maxY) / 2;
    }

    // Fallback space creation
    createFallbackSpaces(walls) {
        console.log('⚠️ Creating fallback spaces...');
        
        const bounds = this.calculateWallsBounds(walls);
        
        const fallbackRoom = {
            id: 0,
            name: "Main Space",
            polygon: [
                { x: bounds.minX, y: bounds.minY },
                { x: bounds.maxX, y: bounds.minY },
                { x: bounds.maxX, y: bounds.maxY },
                { x: bounds.minX, y: bounds.maxY }
            ],
            area: (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY) * this.scale * this.scale,
            center2D: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 },
            bounds: bounds,
            floorDimensions: {
                width: (bounds.maxX - bounds.minX) * this.scale,
                height: this.floorHeight,
                depth: (bounds.maxY - bounds.minY) * this.scale
            },
            floorPosition: {
                x: 0,
                y: -this.floorHeight / 2,
                z: 0
            },
            type: "general",
            confidence: 0.5
        };
        
        const floorMeshes = [{
            geometry: {
                type: 'BoxGeometry',
                width: fallbackRoom.floorDimensions.width,
                height: fallbackRoom.floorDimensions.height,
                depth: fallbackRoom.floorDimensions.depth
            },
            material: {
                type: 'MeshStandardMaterial',
                color: 0xf5f5f5,
                roughness: 0.8,
                metalness: 0.1
            },
            position: fallbackRoom.floorPosition,
            userData: {
                roomId: 0,
                roomName: "Main Space",
                roomType: "general"
            }
        }];
        
        return {
            rooms: [fallbackRoom],
            floorMeshes: floorMeshes,
            debugInfo: { fallback: true }
        };
    }

    calculateWallsBounds(walls) {
        if (walls.length === 0) {
            return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
        }
        
        const allX = walls.flatMap(w => [w.x1, w.x2]);
        const allY = walls.flatMap(w => [w.y1, w.y2]);
        
        return {
            minX: Math.min(...allX),
            maxX: Math.max(...allX),
            minY: Math.min(...allY),
            maxY: Math.max(...allY)
        };
    }

    // Debug utilities
    getDebugInfo() {
        return {
            roomsDetected: this.rooms.length,
            totalArea: this.rooms.reduce((sum, r) => sum + r.area, 0),
            averageConfidence: this.rooms.reduce((sum, r) => sum + r.confidence, 0) / Math.max(this.rooms.length, 1),
            roomTypes: this.rooms.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
            }, {})
        };
    }

    enableDebugMode() {
        this.debugMode = true;
        console.log('🔧 Floor detector debug mode enabled');
    }

    disableDebugMode() {
        this.debugMode = false;
        console.log('🔧 Floor detector debug mode disabled');
    }
}
