import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { WallReader } from "./read.js";

class OptimizedHouseViewer {
    constructor() {
        this.wallReader = new WallReader();
        this.gltfLoader = new GLTFLoader();
        this.doorModel = null;
        this.windowModel = null;
        this.currentHouseData = null;
        this.debugMode = false;
        this.performanceMonitor = {
            frameCount: 0,
            lastTime: performance.now()
        };
        
        this.init();
        this.loadModels();

        // Global access
        window.houseViewer = this;
        
        // Debug functions
        window.setDoorPosition = (doorIndex, settings) => this.setIndividualPosition('door', doorIndex, settings);
        window.setWindowPosition = (windowIndex, settings) => this.setIndividualPosition('window', windowIndex, settings);
        window.showPositions = () => this.showAllPositions();
        window.resetPositions = () => this.resetAllPositions();
    }

    init() {
        console.log('🏠 Initializing Optimized House Viewer...');
        
        // Update loading progress
        window.UIHelpers?.updateLoadingProgress(10, 'Setting up 3D scene...');

        // Enhanced scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 30, 150);

        // Optimized camera setup
        this.camera = new THREE.PerspectiveCamera(
            45, // Reduced FOV for better precision
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        this.camera.position.set(25, 15, 25);
        this.camera.lookAt(0, 0, 0);

        // High-performance renderer setup
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            precision: "highp"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enhanced shadow settings
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        
        // Color and tone mapping
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        document.body.appendChild(this.renderer.domElement);

        // Enhanced orbit controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.03;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 100;
        this.controls.maxPolarAngle = Math.PI / 2.05;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.3;
        this.controls.enablePan = true;
        this.controls.panSpeed = 0.8;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.6;

        // Professional lighting setup
        this.setupProfessionalLighting();

        // Event listeners
        window.addEventListener("resize", () => this.onWindowResize(), false);
        this.renderer.domElement.addEventListener('dblclick', () => this.resetCamera());

        // Performance monitoring
        this.setupPerformanceMonitoring();

        window.UIHelpers?.updateLoadingProgress(30, 'Loading 3D models...');
        
        // Start render loop
        this.animate();
    }

    setupProfessionalLighting() {
        // Remove existing lights
        this.scene.children.filter(child => child.type.includes('Light')).forEach(light => {
            this.scene.remove(light);
        });

        // Ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Main directional light (sun simulation)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
        mainLight.position.set(20, 25, 15);
        mainLight.castShadow = true;
        
        // High-resolution shadow map
        mainLight.shadow.mapSize.width = 4096;
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.near = 0.1;
        mainLight.shadow.camera.far = 200;
        mainLight.shadow.camera.left = -30;
        mainLight.shadow.camera.right = 30;
        mainLight.shadow.camera.top = 30;
        mainLight.shadow.camera.bottom = -30;
        mainLight.shadow.bias = -0.0005;
        mainLight.shadow.normalBias = 0.02;
        this.scene.add(mainLight);

        // Fill lights for balanced illumination
        const fillLight1 = new THREE.DirectionalLight(0x87ceeb, 0.4);
        fillLight1.position.set(-15, 12, -15);
        this.scene.add(fillLight1);

        const fillLight2 = new THREE.DirectionalLight(0xffa500, 0.2);
        fillLight2.position.set(15, 8, -20);
        this.scene.add(fillLight2);

        // Hemisphere light for natural sky lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1d, 0.4);
        this.scene.add(hemisphereLight);

        console.log('✨ Professional lighting setup completed');
    }

    setupPerformanceMonitoring() {
        this.performanceStats = {
            frameCount: 0,
            lastTime: performance.now(),
            averageFPS: 60
        };
    }

    async loadModels() {
        try {
            window.UIHelpers?.updateLoadingProgress(50, 'Loading door models...');

            // Attempt to load door model
            try {
                const doorGltf = await this.gltfLoader.loadAsync("/3d/models/Nice Door.glb");
                this.doorModel = doorGltf.scene;
                this.setupModelShadows(this.doorModel);
                console.log('🚪 Door model loaded successfully');
            } catch (error) {
                console.log('🚪 Door model not found, using fallback');
                this.doorModel = null;
            }

            window.UIHelpers?.updateLoadingProgress(70, 'Loading window models...');

            // Attempt to load window model
            try {
                const windowGltf = await this.gltfLoader.loadAsync("/3d/models/Window Large.glb");
                this.windowModel = windowGltf.scene;
                this.setupModelShadows(this.windowModel);
                console.log('🪟 Window model loaded successfully');
            } catch (error) {
                console.log('🪟 Window model not found, using fallback');
                this.windowModel = null;
            }

            window.UIHelpers?.updateLoadingProgress(90, 'Loading house data...');
            this.loadHouseData();
        } catch (error) {
            console.error('❌ Error loading models:', error);
            this.loadHouseData();
        }
    }

    setupModelShadows(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Optimize material properties
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            mat.roughness = Math.max(mat.roughness || 0.7, 0.3);
                            mat.metalness = Math.min(mat.metalness || 0.2, 0.6);
                        });
                    } else {
                        child.material.roughness = Math.max(child.material.roughness || 0.7, 0.3);
                        child.material.metalness = Math.min(child.material.metalness || 0.2, 0.6);
                    }
                }
            }
        });
    }

    async loadHouseData() {
        try {
            // Check for uploaded data first
            let houseData = window.uploadedHouseData;

            if (!houseData) {
                // Load default data
                try {
                    houseData = await this.wallReader.loadWallData("/3d/data/home.json");
                } catch (error) {
                    console.log('⚠️ Default data not found, creating fallback');
                    houseData = this.createFallbackData();
                }
            }

            if (houseData) {
                console.log('🏠 House data loaded:', houseData);
                this.currentHouseData = houseData;
                this.createHouseFromData(houseData);
                window.UIHelpers?.updateStats(houseData);
                window.UIHelpers?.showStatusMessage(
                    "3D House loaded successfully!", 
                    "success", 
                    `${houseData.walls.length} walls, ${(houseData.doors||[]).length} doors, ${(houseData.windows||[]).length} windows`
                );
            } else {
                console.error('❌ No house data available');
                this.createFallbackHouse();
                window.UIHelpers?.showStatusMessage("Using fallback house design", "warning");
            }
        } catch (error) {
            console.error('❌ Error loading house data:', error);
            this.createFallbackHouse();
            window.UIHelpers?.showStatusMessage("Error loading house data", "error", error.message);
        } finally {
            window.UIHelpers?.updateLoadingProgress(100, 'House rendering complete!');
            setTimeout(() => {
                window.UIHelpers?.hideLoadingScreen();
            }, 800);
        }
    }

    createFallbackData() {
        return {
            walls: [
                { x1: 0, y1: 0, x2: 100, y2: 0 },
                { x1: 100, y1: 0, x2: 100, y2: 100 },
                { x1: 100, y1: 100, x2: 0, y2: 100 },
                { x1: 0, y1: 100, x2: 0, y2: 0 }
            ],
            doors: [],
            windows: [],
            metadata: { gridSize: 10 }
        };
    }

    // Method to load custom data from uploaded file
    loadCustomData(jsonData) {
        console.log('📁 Loading custom house data...');
        
        // Clear existing house
        this.clearScene();

        // Process new data
        this.wallReader = new WallReader();
        const processedData = this.wallReader.processCustomData(jsonData);

        if (processedData) {
            this.currentHouseData = processedData;
            this.createHouseFromData(processedData);
            window.UIHelpers?.updateStats(processedData);
            this.resetCamera();
            
            window.UIHelpers?.showStatusMessage(
                "Custom house data loaded!", 
                "success", 
                "The 3D model has been updated with your data"
            );
        } else {
            window.UIHelpers?.showStatusMessage(
                "Error processing data", 
                "error", 
                "Please check your JSON file format"
            );
        }
    }

    clearScene() {
        // Remove all house-related objects
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.userData.isHouseElement) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            this.disposeObject(obj);
        });

        console.log(`🧹 Cleared ${objectsToRemove.length} objects from scene`);
    }

    disposeObject(obj) {
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(mat => {
                    if (mat.map) mat.map.dispose();
                    if (mat.normalMap) mat.normalMap.dispose();
                    if (mat.roughnessMap) mat.roughnessMap.dispose();
                    mat.dispose();
                });
            } else {
                if (obj.material.map) obj.material.map.dispose();
                if (obj.material.normalMap) obj.material.normalMap.dispose();
                if (obj.material.roughnessMap) obj.material.roughnessMap.dispose();
                obj.material.dispose();
            }
        }
    }

    createHouseFromData(houseData) {
        const house = new THREE.Group();
        house.userData.isHouseElement = true;

        // Create enhanced materials
        const materials = this.createEnhancedMaterials();

        console.log('🏗️ Starting house construction...');
        console.log(`📐 Rooms detected: ${houseData.rooms.length}`);

        // Create precise floors based on room detection
        if (houseData.floorMeshes && houseData.floorMeshes.length > 0) {
            houseData.floorMeshes.forEach((floorMesh, index) => {
                const floorGeometry = new THREE.BoxGeometry(
                    floorMesh.geometry.width,
                    floorMesh.geometry.height,
                    floorMesh.geometry.depth
                );

                const floorMaterial = new THREE.MeshStandardMaterial({
                    color: floorMesh.material.color || 0xf5f5f5,
                    roughness: floorMesh.material.roughness || 0.8,
                    metalness: floorMesh.material.metalness || 0.1,
                    transparent: false,
                    depthWrite: true,
                    depthTest: true,
                    side: THREE.FrontSide
                });

                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.position.set(
                    floorMesh.position.x,
                    floorMesh.position.y,
                    floorMesh.position.z
                );
                floor.receiveShadow = true;
                floor.userData.isHouseElement = true;
                floor.userData.roomInfo = floorMesh.userData;

                house.add(floor);
                console.log(`🏠 Floor created for ${floorMesh.userData?.roomName || 'Room'} at position:`, floorMesh.position);
            });
        } else {
            // Fallback floor creation
            houseData.rooms.forEach((room, index) => {
                if (!room.floorDimensions || !room.floorPosition) return;
                
                const floorGeometry = new THREE.BoxGeometry(
                    room.floorDimensions.width,
                    room.floorDimensions.height,
                    room.floorDimensions.depth
                );

                const floorMaterial = materials.floors[index % materials.floors.length];
                const floor = new THREE.Mesh(floorGeometry, floorMaterial);

                floor.position.set(
                    room.floorPosition.x,
                    room.floorPosition.y,
                    room.floorPosition.z
                );
                floor.receiveShadow = true;
                floor.userData.isHouseElement = true;
                floor.userData.roomName = room.name;

                house.add(floor);
                console.log(`🏠 Fallback floor created for ${room.name}`);
            });
        }

        // Create all walls with accurate positioning
        houseData.walls.forEach((wall, index) => {
            const wallMesh = this.createAccurateWall(wall, materials, index);
            if (wallMesh) {
                wallMesh.userData.isHouseElement = true;
                wallMesh.userData.wallId = index;
                house.add(wallMesh);
            }
        });

        // Create doors with precise wall attachment
        if (houseData.doors && houseData.doors.length > 0) {
            houseData.doors.forEach((door, index) => {
                const relatedWall = this.findAccurateWallByPosition(door.position2D.x, door.position2D.y, houseData.walls);

                if (relatedWall) {
                    const doorGroup = this.createPreciseDoor(door, relatedWall, materials, index);
                    if (doorGroup) {
                        doorGroup.userData.isHouseElement = true;
                        doorGroup.userData.doorIndex = index;
                        doorGroup.userData.wallId = relatedWall.id;
                        house.add(doorGroup);
                        console.log(`🚪 Door ${index} created at position:`, door.position3D);
                    }
                } else {
                    console.warn(`🚪 Warning: Door ${index} could not find related wall`);
                }
            });
        }

        // Create windows with precise wall attachment
        if (houseData.windows && houseData.windows.length > 0) {
            houseData.windows.forEach((window, index) => {
                const relatedWall = this.findAccurateWallByPosition(window.position2D.x, window.position2D.y, houseData.walls);

                if (relatedWall) {
                    const windowGroup = this.createPreciseWindow(window, relatedWall, materials, index);
                    if (windowGroup) {
                        windowGroup.userData.isHouseElement = true;
                        windowGroup.userData.windowIndex = index;
                        windowGroup.userData.wallId = relatedWall.id;
                        house.add(windowGroup);
                        console.log(`🪟 Window ${index} created at position:`, window.position3D);
                    }
                } else {
                    console.warn(`🪟 Warning: Window ${index} could not find related wall`);
                }
            });
        }

        this.scene.add(house);
        console.log('🏠 House construction completed successfully!');
    }

    createEnhancedMaterials() {
        return {
            exteriorWall: new THREE.MeshStandardMaterial({
                color: 0xe6e6e6,
                roughness: 0.7,
                metalness: 0.1,
                transparent: false
            }),
            interiorWall: new THREE.MeshStandardMaterial({
                color: 0xf5f5f5,
                roughness: 0.8,
                metalness: 0.05,
                transparent: false
            }),
            floors: [
                new THREE.MeshStandardMaterial({
                    color: 0xd4af8c,
                    roughness: 0.9,
                    metalness: 0.1
                }),
                new THREE.MeshStandardMaterial({
                    color: 0xc8a882,
                    roughness: 0.85,
                    metalness: 0.1
                }),
                new THREE.MeshStandardMaterial({
                    color: 0xdcc299,
                    roughness: 0.9,
                    metalness: 0.05
                })
            ],
            door: new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.7,
                metalness: 0.1
            }),
            doorFrame: new THREE.MeshStandardMaterial({
                color: 0x654321,
                roughness: 0.8,
                metalness: 0.2
            }),
            window: new THREE.MeshPhysicalMaterial({
                color: 0x87ceeb,
                transparent: true,
                opacity: 0.3,
                roughness: 0.05,
                metalness: 0.1,
                transmission: 0.9,
                thickness: 0.1
            }),
            windowFrame: new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.6,
                metalness: 0.3
            })
        };
    }

    createAccurateWall(wall, materials, wallIndex) {
        try {
            const wallGeometry = new THREE.BoxGeometry(
                wall.dimensions.width,
                wall.dimensions.height,
                wall.dimensions.depth
            );

            const material = wall.type.type === 'exterior' ? 
                materials.exteriorWall : materials.interiorWall;

            const wallMesh = new THREE.Mesh(wallGeometry, material);
            
            // Precise positioning
            wallMesh.position.set(
                wall.center3D.x,
                wall.center3D.y,
                wall.center3D.z
            );
            
            // Accurate rotation
            wallMesh.rotation.set(
                wall.rotation.x,
                wall.rotation.y,
                wall.rotation.z
            );

            wallMesh.castShadow = true;
            wallMesh.receiveShadow = true;
            wallMesh.userData.wallData = wall;

            return wallMesh;
        } catch (error) {
            console.error(`❌ Error creating wall ${wallIndex}:`, error);
            return null;
        }
    }

    findAccurateWallByPosition(x, y, walls) {
        let closestWall = null;
        let minDistance = Infinity;

        walls.forEach((wall, index) => {
            const distance = this.pointToLineDistance(
                { x: x, y: y },
                wall.start2D || { x: wall.x1, y: wall.y1 },
                wall.end2D || { x: wall.x2, y: wall.y2 }
            );

            if (distance < minDistance && distance < 50) { // Reduced tolerance for better accuracy
                minDistance = distance;
                closestWall = { ...wall, id: index };
            }
        });

        return closestWall;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
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

    createPreciseDoor(door, relatedWall, materials, doorIndex) {
        const doorGroup = new THREE.Group();

        try {
            if (this.doorModel) {
                // Use loaded 3D model
                const doorClone = this.doorModel.clone();
                doorClone.scale.set(1.2, 1.0, 1.0); // Adjusted scale for better visibility
                doorClone.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                doorGroup.add(doorClone);
            } else {
                // Create fallback door
                const doorGeometry = new THREE.BoxGeometry(
                    door.dimensions.width,
                    door.dimensions.height,
                    door.dimensions.depth
                );
                const doorMesh = new THREE.Mesh(doorGeometry, materials.door);
                doorMesh.castShadow = true;
                doorMesh.receiveShadow = true;

                // Door frame
                const frameGeometry = new THREE.BoxGeometry(
                    door.dimensions.width + 0.1,
                    door.dimensions.height + 0.1,
                    door.dimensions.depth + 0.05
                );
                const frameMesh = new THREE.Mesh(frameGeometry, materials.doorFrame);
                frameMesh.position.z = -0.025;

                doorGroup.add(frameMesh, doorMesh);
            }

            // Position door accurately
            doorGroup.position.set(
                door.position3D.x,
                door.position3D.y,
                door.position3D.z
            );

            // Align with wall rotation
            if (door.rotation) {
                doorGroup.rotation.set(
                    door.rotation.x,
                    door.rotation.y,
                    door.rotation.z
                );
            }

            return doorGroup;
        } catch (error) {
            console.error(`❌ Error creating door ${doorIndex}:`, error);
            return null;
        }
    }

    createPreciseWindow(window, relatedWall, materials, windowIndex) {
        const windowGroup = new THREE.Group();

        try {
            if (this.windowModel) {
                // Use loaded 3D model
                const windowClone = this.windowModel.clone();
                windowClone.scale.set(1.0, 1.0, 1.0); // Adjusted scale for better visibility
                windowClone.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                windowGroup.add(windowClone);
            } else {
                // Create fallback window
                const frameGeometry = new THREE.BoxGeometry(
                    window.dimensions.width + 0.1,
                    window.dimensions.height + 0.1,
                    window.dimensions.depth
                );
                const frameMesh = new THREE.Mesh(frameGeometry, materials.windowFrame);

                const glassGeometry = new THREE.BoxGeometry(
                    window.dimensions.width,
                    window.dimensions.height,
                    window.dimensions.depth * 0.5
                );
                const glassMesh = new THREE.Mesh(glassGeometry, materials.window);
                glassMesh.position.z = window.dimensions.depth * 0.25;

                windowGroup.add(frameMesh, glassMesh);
            }

            // Position window accurately
            windowGroup.position.set(
                window.position3D.x,
                window.position3D.y,
                window.position3D.z
            );

            // Align with wall rotation
            if (window.rotation) {
                windowGroup.rotation.set(
                    window.rotation.x,
                    window.rotation.y,
                    window.rotation.z
                );
            }

            return windowGroup;
        } catch (error) {
            console.error(`❌ Error creating window ${windowIndex}:`, error);
            return null;
        }
    }

    createFallbackHouse() {
        console.log('🏠 Creating fallback house...');
        
        const house = new THREE.Group();
        house.userData.isHouseElement = true;

        const materials = this.createEnhancedMaterials();

        // Simple room
        const floorGeometry = new THREE.BoxGeometry(10, 0.1, 10);
        const floor = new THREE.Mesh(floorGeometry, materials.floors[0]);
        floor.position.y = -0.05;
        floor.receiveShadow = true;
        floor.userData.isHouseElement = true;

        // Simple walls
        const wallGeometry = new THREE.BoxGeometry(10, 3, 0.2);
        const wall1 = new THREE.Mesh(wallGeometry, materials.exteriorWall);
        wall1.position.set(0, 1.5, 5);
        wall1.castShadow = true;
        wall1.receiveShadow = true;
        wall1.userData.isHouseElement = true;

        const wall2 = new THREE.Mesh(wallGeometry, materials.exteriorWall);
        wall2.position.set(0, 1.5, -5);
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        wall2.userData.isHouseElement = true;

        const wall3 = new THREE.Mesh(wallGeometry, materials.exteriorWall);
        wall3.position.set(5, 1.5, 0);
        wall3.rotation.y = Math.PI / 2;
        wall3.castShadow = true;
        wall3.receiveShadow = true;
        wall3.userData.isHouseElement = true;

        const wall4 = new THREE.Mesh(wallGeometry, materials.exteriorWall);
        wall4.position.set(-5, 1.5, 0);
        wall4.rotation.y = Math.PI / 2;
        wall4.castShadow = true;
        wall4.receiveShadow = true;
        wall4.userData.isHouseElement = true;

        house.add(floor, wall1, wall2, wall3, wall4);
        this.scene.add(house);
        
        console.log('✅ Fallback house created');
    }

    resetCamera() {
        this.camera.position.set(25, 15, 25);
        this.camera.lookAt(0, 0, 0);
        this.controls.reset();
        console.log('📷 Camera reset to default position');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        console.log('📏 Window resized, camera updated');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Update controls
        this.controls.update();

        // Performance monitoring
        this.performanceStats.frameCount++;
        const now = performance.now();
        
        if (now - this.performanceStats.lastTime >= 1000) {
            const fps = Math.round((this.performanceStats.frameCount * 1000) / (now - this.performanceStats.lastTime));
            this.performanceStats.averageFPS = fps;
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastTime = now;
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    // Debug and utility functions
    showAllPositions() {
        if (!this.currentHouseData) return;
        
        console.log('📍 Showing all positions:');
        console.log('Walls:', this.currentHouseData.walls.map((w, i) => ({
            index: i,
            start2D: w.start2D || { x: w.x1, y: w.y1 },
            end2D: w.end2D || { x: w.x2, y: w.y2 },
            center3D: w.center3D
        })));
        
        if (this.currentHouseData.doors) {
            console.log('Doors:', this.currentHouseData.doors.map((d, i) => ({
                index: i,
                position2D: d.position2D,
                position3D: d.position3D
            })));
        }
        
        if (this.currentHouseData.windows) {
            console.log('Windows:', this.currentHouseData.windows.map((w, i) => ({
                index: i,
                position2D: w.position2D,
                position3D: w.position3D
            })));
        }
    }

    resetAllPositions() {
        this.resetCamera();
        console.log('🔄 All positions reset');
    }

    setIndividualPosition(type, index, settings) {
        console.log(`⚙️ Setting ${type} ${index} position:`, settings);
        // Implementation for fine-tuning individual element positions
        // This can be extended for advanced positioning controls
    }
}

// Initialize the viewer when the module loads
new OptimizedHouseViewer();

export { OptimizedHouseViewer };
