import * as THREE from 'three';

export class DoorsAndWindows {
    constructor() {
        console.log('🚪🪟 Initializing Doors and Windows system...');

        // Enhanced materials for realistic rendering
        this.materials = {
            glass: new THREE.MeshPhysicalMaterial({
                color: 0xa8d8ea,
                transparent: true,
                opacity: 0.25,
                roughness: 0.02,
                metalness: 0.05,
                transmission: 0.95,
                thickness: 0.1,
                reflectivity: 0.2,
                clearcoat: 0.3,
                clearcoatRoughness: 0.1,
                ior: 1.5
            }),

            windowFrame: new THREE.MeshStandardMaterial({
                color: 0x4a4a4a,
                roughness: 0.6,
                metalness: 0.4,
                envMapIntensity: 0.5
            }),

            doorWood: new THREE.MeshStandardMaterial({
                color: 0x8b4513,
                roughness: 0.8,
                metalness: 0.1,
                bumpScale: 0.1
            }),

            doorFrame: new THREE.MeshStandardMaterial({
                color: 0x654321,
                roughness: 0.7,
                metalness: 0.2
            }),

            doorHandle: new THREE.MeshStandardMaterial({
                color: 0xc0c0c0,
                roughness: 0.3,
                metalness: 0.8,
                envMapIntensity: 1.0
            }),

            windowSill: new THREE.MeshStandardMaterial({
                color: 0xe0e0e0,
                roughness: 0.6,
                metalness: 0.1
            })
        };

        this.defaultDimensions = {
            door: { width: 1.0, height: 2.2, depth: 0.05 },
            window: { width: 1.2, height: 1.2, depth: 0.1 },
            frame: { thickness: 0.08 },
            handle: { radius: 0.02, length: 0.12 }
        };

        console.log('✅ Doors and Windows system initialized');
    }

    // Create enhanced window with realistic details
    createEnhancedWindow(width = 1.2, height = 1.2, depth = 0.1) {
        const windowGroup = new THREE.Group();
        const frameThickness = this.defaultDimensions.frame.thickness;

        try {
            // Main window frame
            const frameGeometry = new THREE.BoxGeometry(
                width + frameThickness * 2, 
                height + frameThickness * 2, 
                depth
            );
            const frame = new THREE.Mesh(frameGeometry, this.materials.windowFrame);
            frame.castShadow = true;
            frame.receiveShadow = true;

            // Glass panels with subdivisions
            const glassWidth = (width - frameThickness) / 2;
            const glassHeight = (height - frameThickness) / 2;

            // Create 4 glass panels for more realistic look
            const glassPositions = [
                { x: -glassWidth/2, y: glassHeight/2 },   // Top left
                { x: glassWidth/2, y: glassHeight/2 },    // Top right
                { x: -glassWidth/2, y: -glassHeight/2 },  // Bottom left
                { x: glassWidth/2, y: -glassHeight/2 }    // Bottom right
            ];

            glassPositions.forEach(pos => {
                const glassGeometry = new THREE.BoxGeometry(glassWidth - 0.02, glassHeight - 0.02, depth * 0.3);
                const glass = new THREE.Mesh(glassGeometry, this.materials.glass);
                glass.position.set(pos.x, pos.y, depth * 0.35);
                glass.receiveShadow = true;
                windowGroup.add(glass);
            });

            // Horizontal divider
            const hDividerGeometry = new THREE.BoxGeometry(width, frameThickness * 0.6, depth);
            const hDivider = new THREE.Mesh(hDividerGeometry, this.materials.windowFrame);
            hDivider.castShadow = true;

            // Vertical divider
            const vDividerGeometry = new THREE.BoxGeometry(frameThickness * 0.6, height, depth);
            const vDivider = new THREE.Mesh(vDividerGeometry, this.materials.windowFrame);
            vDivider.castShadow = true;

            // Window sill
            const sillGeometry = new THREE.BoxGeometry(width + frameThickness * 3, frameThickness, depth * 1.5);
            const sill = new THREE.Mesh(sillGeometry, this.materials.windowSill);
            sill.position.set(0, -(height + frameThickness) / 2 - frameThickness / 2, 0);
            sill.castShadow = true;
            sill.receiveShadow = true;

            windowGroup.add(frame, hDivider, vDivider, sill);

            // Add metadata
            windowGroup.userData = {
                type: 'window',
                dimensions: { width, height, depth },
                components: ['frame', 'glass', 'dividers', 'sill']
            };

            console.log(`🪟 Enhanced window created: ${width.toFixed(2)}m x ${height.toFixed(2)}m`);
            return windowGroup;

        } catch (error) {
            console.error('❌ Error creating enhanced window:', error);
            return this.createFallbackWindow(width, height, depth);
        }
    }

    // Create enhanced door with realistic details
    createEnhancedDoor(width = 1.0, height = 2.2, depth = 0.05) {
        const doorGroup = new THREE.Group();
        const frameThickness = this.defaultDimensions.frame.thickness;

        try {
            // Door frame
            const frameGeometry = new THREE.BoxGeometry(
                width + frameThickness * 2, 
                height + frameThickness * 2, 
                depth + frameThickness
            );
            const frame = new THREE.Mesh(frameGeometry, this.materials.doorFrame);
            frame.position.z = -frameThickness / 2;
            frame.castShadow = true;
            frame.receiveShadow = true;

            // Main door panel
            const doorGeometry = new THREE.BoxGeometry(width, height, depth);
            const door = new THREE.Mesh(doorGeometry, this.materials.doorWood);
            door.castShadow = true;
            door.receiveShadow = true;

            // Door panels (decorative)
            const panelWidth = width * 0.8;
            const panelHeight = height * 0.35;

            for (let i = 0; i < 2; i++) {
                const panelGeometry = new THREE.BoxGeometry(panelWidth, panelHeight, depth * 0.1);
                const panel = new THREE.Mesh(panelGeometry, this.materials.doorWood);
                panel.position.set(0, (i === 0 ? 1 : -1) * height * 0.25, depth * 0.05);
                doorGroup.add(panel);
            }

            // Door handle
            const handleGeometry = new THREE.CylinderGeometry(
                this.defaultDimensions.handle.radius,
                this.defaultDimensions.handle.radius,
                this.defaultDimensions.handle.length,
                12
            );
            const handle = new THREE.Mesh(handleGeometry, this.materials.doorHandle);
            handle.rotation.x = Math.PI / 2;
            handle.position.set(width * 0.35, 0, depth + 0.02);
            handle.castShadow = true;

            // Door hinges
            for (let i = 0; i < 3; i++) {
                const hingeGeometry = new THREE.BoxGeometry(0.03, 0.08, 0.02);
                const hinge = new THREE.Mesh(hingeGeometry, this.materials.doorHandle);
                hinge.position.set(-width / 2 - frameThickness / 2, (i - 1) * height * 0.3, 0);
                hinge.castShadow = true;
                doorGroup.add(hinge);
            }

            doorGroup.add(frame, door, handle);

            // Add metadata
            doorGroup.userData = {
                type: 'door',
                dimensions: { width, height, depth },
                components: ['frame', 'panel', 'handle', 'hinges'],
                openable: true
            };

            console.log(`🚪 Enhanced door created: ${width.toFixed(2)}m x ${height.toFixed(2)}m`);
            return doorGroup;

        } catch (error) {
            console.error('❌ Error creating enhanced door:', error);
            return this.createFallbackDoor(width, height, depth);
        }
    }

    // Create sliding glass door for modern homes
    createSlidingDoor(width = 2.4, height = 2.4, depth = 0.08) {
        const slidingGroup = new THREE.Group();

        try {
            const frameThickness = 0.06;
            const panelWidth = width / 2 - frameThickness;

            // Main frame
            const frameGeometry = new THREE.BoxGeometry(width + frameThickness, height + frameThickness, depth);
            const frame = new THREE.Mesh(frameGeometry, this.materials.windowFrame);
            frame.castShadow = true;
            frame.receiveShadow = true;

            // Glass panels
            const glassGeometry = new THREE.BoxGeometry(panelWidth, height - frameThickness * 2, depth * 0.3);

            const leftPanel = new THREE.Mesh(glassGeometry, this.materials.glass);
            leftPanel.position.set(-width / 4, 0, depth * 0.35);
            leftPanel.receiveShadow = true;

            const rightPanel = new THREE.Mesh(glassGeometry, this.materials.glass);
            rightPanel.position.set(width / 4, 0, depth * 0.35);
            rightPanel.receiveShadow = true;

            // Center divider
            const dividerGeometry = new THREE.BoxGeometry(frameThickness, height, depth);
            const divider = new THREE.Mesh(dividerGeometry, this.materials.windowFrame);
            divider.castShadow = true;

            // Top and bottom tracks
            const trackGeometry = new THREE.BoxGeometry(width, frameThickness * 0.5, depth);

            const topTrack = new THREE.Mesh(trackGeometry, this.materials.windowFrame);
            topTrack.position.y = height / 2;

            const bottomTrack = new THREE.Mesh(trackGeometry, this.materials.windowFrame);
            bottomTrack.position.y = -height / 2;

            // Handles
            for (let i = 0; i < 2; i++) {
                const handleGeometry = new THREE.BoxGeometry(0.02, 0.3, 0.03);
                const handle = new THREE.Mesh(handleGeometry, this.materials.doorHandle);
                handle.position.set((i === 0 ? -1 : 1) * panelWidth * 0.4, 0, depth + 0.015);
                handle.castShadow = true;
                slidingGroup.add(handle);
            }

            slidingGroup.add(frame, leftPanel, rightPanel, divider, topTrack, bottomTrack);

            slidingGroup.userData = {
                type: 'sliding_door',
                dimensions: { width, height, depth },
                components: ['frame', 'glass_panels', 'tracks', 'handles']
            };

            console.log(`🚪 Sliding door created: ${width.toFixed(2)}m x ${height.toFixed(2)}m`);
            return slidingGroup;

        } catch (error) {
            console.error('❌ Error creating sliding door:', error);
            return this.createFallbackDoor(width, height, depth);
        }
    }

    // Create french window (tall window with door-like appearance)
    createFrenchWindow(width = 1.5, height = 2.2, depth = 0.1) {
        const frenchGroup = new THREE.Group();

        try {
            const frameThickness = this.defaultDimensions.frame.thickness;
            const panelWidth = width / 2 - frameThickness;

            // Main frame
            const frameGeometry = new THREE.BoxGeometry(width + frameThickness, height + frameThickness, depth);
            const frame = new THREE.Mesh(frameGeometry, this.materials.windowFrame);
            frame.castShadow = true;
            frame.receiveShadow = true;

            // Glass panels with grid pattern
            const rows = 4;
            const cols = 2;
            const glassWidth = panelWidth / cols - frameThickness * 0.5;
            const glassHeight = (height - frameThickness * 2) / rows - frameThickness * 0.5;

            for (let col = 0; col < 2; col++) {
                for (let row = 0; row < rows; row++) {
                    const glassGeometry = new THREE.BoxGeometry(glassWidth, glassHeight, depth * 0.3);
                    const glass = new THREE.Mesh(glassGeometry, this.materials.glass);

                    glass.position.set(
                        (col - 0.5) * panelWidth,
                        (row - rows/2 + 0.5) * (glassHeight + frameThickness * 0.5),
                        depth * 0.35
                    );

                    glass.receiveShadow = true;
                    frenchGroup.add(glass);
                }
            }

            // Grid dividers
            // Vertical dividers
            for (let i = 0; i < 3; i++) {
                const vDividerGeometry = new THREE.BoxGeometry(frameThickness * 0.4, height - frameThickness, depth);
                const vDivider = new THREE.Mesh(vDividerGeometry, this.materials.windowFrame);
                vDivider.position.x = (i - 1) * width / 2;
                vDivider.castShadow = true;
                frenchGroup.add(vDivider);
            }

            // Horizontal dividers
            for (let i = 1; i < rows; i++) {
                const hDividerGeometry = new THREE.BoxGeometry(width - frameThickness, frameThickness * 0.4, depth);
                const hDivider = new THREE.Mesh(hDividerGeometry, this.materials.windowFrame);
                hDivider.position.y = (i - rows/2) * (height - frameThickness * 2) / rows;
                hDivider.castShadow = true;
                frenchGroup.add(hDivider);
            }

            // Handles
            const handleGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
            const leftHandle = new THREE.Mesh(handleGeometry, this.materials.doorHandle);
            leftHandle.rotation.x = Math.PI / 2;
            leftHandle.position.set(-width * 0.15, 0, depth + 0.01);
            leftHandle.castShadow = true;

            const rightHandle = new THREE.Mesh(handleGeometry, this.materials.doorHandle);
            rightHandle.rotation.x = Math.PI / 2;
            rightHandle.position.set(width * 0.15, 0, depth + 0.01);
            rightHandle.castShadow = true;

            frenchGroup.add(frame, leftHandle, rightHandle);

            frenchGroup.userData = {
                type: 'french_window',
                dimensions: { width, height, depth },
                components: ['frame', 'glass_grid', 'handles']
            };

            console.log(`🪟 French window created: ${width.toFixed(2)}m x ${height.toFixed(2)}m`);
            return frenchGroup;

        } catch (error) {
            console.error('❌ Error creating french window:', error);
            return this.createFallbackWindow(width, height, depth);
        }
    }

    // Fallback simple door
    createFallbackDoor(width = 1.0, height = 2.2, depth = 0.05) {
        const doorGroup = new THREE.Group();

        const frameGeometry = new THREE.BoxGeometry(width + 0.1, height + 0.1, depth + 0.02);
        const frame = new THREE.Mesh(frameGeometry, this.materials.doorFrame);

        const doorGeometry = new THREE.BoxGeometry(width, height, depth);
        const door = new THREE.Mesh(doorGeometry, this.materials.doorWood);
        door.position.z = 0.01;

        doorGroup.add(frame, door);
        doorGroup.userData = { type: 'simple_door', fallback: true };

        return doorGroup;
    }

    // Fallback simple window
    createFallbackWindow(width = 1.2, height = 1.2, depth = 0.1) {
        const windowGroup = new THREE.Group();

        const frameGeometry = new THREE.BoxGeometry(width + 0.1, height + 0.1, depth);
        const frame = new THREE.Mesh(frameGeometry, this.materials.windowFrame);

        const glassGeometry = new THREE.BoxGeometry(width, height, depth * 0.3);
        const glass = new THREE.Mesh(glassGeometry, this.materials.glass);
        glass.position.z = depth * 0.35;

        windowGroup.add(frame, glass);
        windowGroup.userData = { type: 'simple_window', fallback: true };

        return windowGroup;
    }

    // Position element with precise alignment
    positionElement(element, position, rotation = { x: 0, y: 0, z: 0 }) {
        if (!element || !position) return element;

        element.position.set(
            position.x || 0,
            position.y || 0,
            position.z || 0
        );

        element.rotation.set(
            rotation.x || 0,
            rotation.y || 0,
            rotation.z || 0
        );

        // Update shadows
        element.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        return element;
    }

    // Get appropriate door type based on dimensions and context
    getDoorType(width, height, isExterior = false) {
        if (width > 2.0) return 'sliding_door';
        if (isExterior && height > 2.1) return 'enhanced_door';
        return 'enhanced_door';
    }

    // Get appropriate window type based on dimensions and context
    getWindowType(width, height, isExterior = false) {
        if (width > 2.0) return 'sliding_door';
        if (height > 2.0) return 'french_window';
        return 'enhanced_window';
    }

    // Create door based on specifications
    createDoorBySpec(spec) {
        const { width = 1.0, height = 2.2, depth = 0.05, type = 'enhanced_door' } = spec;

        switch (type) {
            case 'sliding_door':
                return this.createSlidingDoor(width, height, depth);
            case 'enhanced_door':
            default:
                return this.createEnhancedDoor(width, height, depth);
        }
    }

    // Create window based on specifications
    createWindowBySpec(spec) {
        const { width = 1.2, height = 1.2, depth = 0.1, type = 'enhanced_window' } = spec;

        switch (type) {
            case 'french_window':
                return this.createFrenchWindow(width, height, depth);
            case 'sliding_door': // Large window opening
                return this.createSlidingDoor(width, height, depth);
            case 'enhanced_window':
            default:
                return this.createEnhancedWindow(width, height, depth);
        }
    }

    // Utility function to update materials (for theme changes)
    updateMaterials(theme = 'default') {
        const themes = {
            modern: {
                windowFrame: { color: 0x2c2c2c },
                doorWood: { color: 0x4a4a4a },
                doorFrame: { color: 0x333333 }
            },
            classic: {
                windowFrame: { color: 0x8b4513 },
                doorWood: { color: 0x654321 },
                doorFrame: { color: 0x5a3d1b }
            },
            default: {} // Use existing colors
        };

        const themeColors = themes[theme] || themes.default;

        Object.keys(themeColors).forEach(materialKey => {
            if (this.materials[materialKey]) {
                Object.assign(this.materials[materialKey], themeColors[materialKey]);
            }
        });

        console.log(`🎨 Updated materials to ${theme} theme`);
    }

    // Dispose of materials and geometries (for memory management)
    dispose() {
        console.log('🧹 Disposing doors and windows materials...');

        Object.values(this.materials).forEach(material => {
            if (material.dispose) {
                material.dispose();
            }
        });

        console.log('✅ Doors and windows materials disposed');
    }
}