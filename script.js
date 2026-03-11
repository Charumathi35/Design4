document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    // Initialize 3D Hero
    init3DHero();

    // Initialize old GSAP Path Logic
    initGSAP();

    // Scroll to explore click handler
    document.querySelector('.scroll-indicator').addEventListener('click', () => {
        const firstCompany = document.getElementById('pricol-limited');
        if (firstCompany) {
            const heroH = document.getElementById('hero-3d').offsetHeight;
            const sectionCenter = heroH + firstCompany.offsetTop + (firstCompany.offsetHeight / 2);
            const viewportCenter = window.innerHeight / 2;

            window.scrollTo({
                top: sectionCenter - viewportCenter,
                behavior: 'smooth'
            });
        }
    });
});

function init3DHero() {
    // Collect companies from DOM
    const companies = [];
    document.querySelectorAll('#content-container section.company').forEach((sec, index) => {
        const logoImg = sec.querySelector('.company-logo');
        const rawTitle = sec.querySelector('h2').innerText;

        // Extract short names like "Precision", "Durapack", "Limited" from full titles
        let shortTitle = rawTitle.replace(/Pricol/gi, '').trim();
        shortTitle = shortTitle.replace(/Products$/gi, '').trim();
        shortTitle = shortTitle.replace(/Industries$/gi, '').trim();
        shortTitle = shortTitle.replace(/Private Limited$/gi, '').trim();

        // Keep fallback explicitly since "Pricol Limited" might get fully stripped if not careful 
        // (but above logic only drops "Private Limited" suffix, so "Limited" stays)
        if (!shortTitle) shortTitle = rawTitle;

        companies.push({
            id: sec.id,
            title: shortTitle, // The 3D text label will now use this short name
            logo: logoImg ? logoImg.src : '',
            html: sec.querySelector('.card').innerHTML, // The modal will still use the full HTML
            index: index
        });
    });

    const hero3D = document.getElementById('hero-3d');
    const scene = new THREE.Scene();
    scene.background = null; // transparent to show CSS deep space gradient
    scene.fog = new THREE.FogExp2(0x050a15, 0.004);

    // ─── ISOMETRIC TOP-DOWN CAMERA (matches reference image) ────────────────────
    // Pull back significantly to fit all spread-out elements in a single section
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 290, 130); // Pulled back further to see all corners
    camera.lookAt(0, 0, 0);

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0); // Transparent clear
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(renderer.domElement);
    } catch (e) {
        console.error("WebGL failed to initialize:", e);
        // If WebGL fails (like hitting context limit or hardware acceleration is off)
        // gracefully hide the 3D hero area and let the rest of the site load.
        if (hero3D) hero3D.style.display = 'none';
        return; // Exit the 3D hero initialization completely
    }

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 320;
    controls.minDistance = 30;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableRotate = false; // Disable drag-to-rotate
    controls.target.set(0, 0, 0);

    // ─── POST PROCESSING (Bloom) ────────────────────────────────────────────────
    const renderScene = new THREE.RenderPass(scene, camera);
    const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.5, 0.21); // threshold 0.21 as requested
    const composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // ─── LIGHTING ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x223355, 2.5));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(80, 120, 60);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x0044ff, 0.6);
    rimLight.position.set(-80, 40, -60);
    scene.add(rimLight);

    const blueLight = new THREE.PointLight(0x00aaff, 4, 220);
    blueLight.position.set(0, 25, 0);
    scene.add(blueLight);

    const goldLight = new THREE.PointLight(0xD4AF37, 2, 180);
    goldLight.position.set(-30, 15, 30);
    scene.add(goldLight);

    const circuitGroup = new THREE.Group();
    scene.add(circuitGroup);

    // ─── FLAT CHIP PLATFORM (Clean & Minimal) ──────────────────────────────────
    const chipGroup = new THREE.Group();
    circuitGroup.add(chipGroup);

    const isMobile = window.innerWidth < 1024;
    const GRID = isMobile ? 7 : 9;
    const CELL = 2.8;
    const GAP = 0.18;
    const STEP = CELL + GAP;
    const OFFSET = (GRID - 1) * STEP / 2;

    for (let row = 0; row < GRID; row++) {
        for (let col = 0; col < GRID; col++) {
            const cx = col * STEP - OFFSET;
            const cz = row * STEP - OFFSET;
            const dist = Math.sqrt(cx * cx + cz * cz);
            const bright = Math.max(0, 1 - dist / (OFFSET * 1.5));
            const cell = new THREE.Mesh(
                new THREE.BoxGeometry(CELL, 0.4, CELL),
                new THREE.MeshPhongMaterial({
                    color: 0x0a1628,
                    emissive: new THREE.Color(0x003377).multiplyScalar(0.4 + bright * 0.9),
                    transparent: true, opacity: 0.75 + bright * 0.2
                })
            );
            cell.position.set(cx, 0.5, cz);
            chipGroup.add(cell);
        }
    }

    // ── SPARK PARTICLES scattered across the top chip surface ──
    const sparkCount = 180;
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let s = 0; s < sparkCount; s++) {
        sparkPositions[s * 3 + 0] = (Math.random() - 0.5) * (GRID * STEP);
        sparkPositions[s * 3 + 1] = 3.2 + Math.random() * 8;
        sparkPositions[s * 3 + 2] = (Math.random() - 0.5) * (GRID * STEP);
    }
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkParticles = new THREE.Points(sparkGeo,
        new THREE.PointsMaterial({ color: 0x88ccff, size: 0.4, transparent: true, opacity: 0.85 }));
    chipGroup.add(sparkParticles);

    // ── CENTER GLOW CORE (pink-white like reference) ──
    const coreLight = new THREE.PointLight(0xff88cc, 8, 35);
    coreLight.position.set(0, 4, 0);
    chipGroup.add(coreLight);
    const coreMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffaadd })
    );
    coreMesh.position.set(0, 4, 0);
    chipGroup.add(coreMesh);

    // Side plates removed for flat design


    // ── ORBIT RING (large ring around the base) ──
    const cpuRing = new THREE.Mesh(
        new THREE.RingGeometry(30, 31.5, 80),
        new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
    );
    cpuRing.rotation.x = Math.PI / 2;
    cpuRing.position.y = -1.5;
    circuitGroup.add(cpuRing);

    const orbitRing = new THREE.Mesh(
        new THREE.TorusGeometry(34, 0.5, 8, 90),
        new THREE.MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.28 })
    );
    orbitRing.rotation.x = Math.PI / 2;
    circuitGroup.add(orbitRing);

    // ── CHIP AMBIENT LIGHT ──
    const chipLight = new THREE.PointLight(0x0066ff, 6, 80);
    chipLight.position.set(0, 15, 0);
    circuitGroup.add(chipLight);

    // expose for animate loop
    chipGroup.userData = { sparkGeo, sparkPositions, coreLight, coreMesh };
    const cpuTop = chipGroup;   // alias so entry-animation code still works


    // Center logo — placed ON the chip surface (CORS-safe HTML overlay)
    const centerLogoWrap = document.createElement('div');
    centerLogoWrap.className = 'node-label center-logo-wrap';
    const centerLogoImg = document.createElement('img');
    centerLogoImg.src = 'images/logo_v2.png';
    centerLogoImg.className = 'center-chip-logo';
    centerLogoWrap.appendChild(centerLogoImg);
    document.getElementById('labels-container').appendChild(centerLogoWrap);

    // ─── FLOOR / GRID ──────────────────────────────────────────────────────────
    const gridHelper = new THREE.GridHelper(600, 120, 0x003366, 0x000a1a);
    gridHelper.position.y = -2;
    circuitGroup.add(gridHelper);

    const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(900, 900),
        new THREE.MeshPhongMaterial({ color: 0x020509, depthWrite: false })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.5;
    floorMesh.receiveShadow = true;
    circuitGroup.add(floorMesh);

    // ─── CIRCUIT BOARD BACKGROUND TRACES (High Detail) ──────────────────────
    const bgCircuitGroup = new THREE.Group();
    bgCircuitGroup.position.y = -2.2;
    circuitGroup.add(bgCircuitGroup);

    // ─── Primary neon teal/cyan trace materials (made considerably darker and neater)
    const bgTeal1 = new THREE.LineDashedMaterial({ color: 0x0088aa, opacity: 0.35, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });
    const bgTeal2 = new THREE.LineDashedMaterial({ color: 0x006688, opacity: 0.25, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });
    const bgCyan = new THREE.LineDashedMaterial({ color: 0x004466, opacity: 0.20, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });
    const bgDim = new THREE.LineDashedMaterial({ color: 0x003344, opacity: 0.15, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });
    const bgOrange = new THREE.LineDashedMaterial({ color: 0xaa3300, opacity: 0.30, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });
    const bgRed = new THREE.LineDashedMaterial({ color: 0x881100, opacity: 0.20, transparent: true, dashSize: 2000, gapSize: 2000, dashOffset: 2000 });

    // Via / pad geometries and materials
    const viaGeo = new THREE.RingGeometry(0.4, 1.0, 12);
    const viaTeal = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide, opacity: 0.9, transparent: true });
    const viaOrange = new THREE.MeshBasicMaterial({ color: 0xff5500, side: THREE.DoubleSide, opacity: 1.0, transparent: true });
    const dotGeo = new THREE.CircleGeometry(1.2, 10);
    const dotOrange = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.95 });
    const dotTeal = new THREE.MeshBasicMaterial({ color: 0x00ffaa, transparent: true, opacity: 0.90 });

    // \u2500\u2500 DENSE RADIATING CIRCUIT TRACES FROM CENTER (like reference image) \u2500\u2500
    for (let i = 0; i < 65; i++) {
        const angle = (i / 65) * Math.PI * 2;
        const startRad = 15 + Math.random() * 20;
        let x = Math.cos(angle) * startRad;
        let z = Math.sin(angle) * startRad;

        const pts = [new THREE.Vector3(x, 0, z)];
        const segs = Math.floor(Math.random() * 4) + 2; 
        const r = Math.random();
        let mat = bgTeal2, viaMat = viaTeal;

        if (r > 0.90) { mat = bgOrange; viaMat = viaOrange; }
        else if (r > 0.82) { mat = bgRed; viaMat = viaOrange; }
        else if (r > 0.60) { mat = bgTeal1; viaMat = viaTeal; }
        else if (r > 0.35) { mat = bgCyan; viaMat = viaTeal; }
        else { mat = bgDim; viaMat = viaTeal; }

        let dir = Math.abs(x) > Math.abs(z) ? 'x' : 'z'; 

        for (let j = 0; j < segs; j++) {
            const len = 30 + Math.random() * 60;
            if (dir === 'x') {
                x += Math.sign(x || 1) * len; 
                dir = 'z'; 
            } else if (dir === 'z') {
                z += Math.sign(z || 1) * len;
                dir = 'x'; 
            }
            pts.push(new THREE.Vector3(x, 0, z));
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const circuitLine = new THREE.Line(lineGeo, mat);
        circuitLine.computeLineDistances();
        bgCircuitGroup.add(circuitLine);

        // Glowing ring vias at start/end of traces
        [pts[0], pts[pts.length - 1]].forEach(p => {
            if (Math.random() > 0.3) {
                const ring = new THREE.Mesh(viaGeo, viaMat);
                ring.position.set(p.x, 0.06, p.z);
                ring.rotation.x = -Math.PI / 2;
                bgCircuitGroup.add(ring);
            }
        });

        // Filled dot at mid-trace corners
        pts.forEach((p, idx) => {
            if (idx > 0 && idx < pts.length - 1 && Math.random() > 0.6) {
                const isOrange = mat === bgOrange || mat === bgRed;
                const dot = new THREE.Mesh(dotGeo, isOrange ? dotOrange : dotTeal);
                dot.position.set(p.x, 0.07, p.z);
                dot.rotation.x = -Math.PI / 2;
                bgCircuitGroup.add(dot);
            }
        });
    }

    // \u2500\u2500 EXTRA SCATTERED ORANGE & TEAL SOLDER DOTS across board (like reference) \u2500\u2500
    for (let i = 0; i < 300; i++) {
        const dot = new THREE.Mesh(dotGeo, Math.random() > 0.5 ? dotOrange : dotTeal);
        dot.position.set((Math.random() - 0.5) * 800, 0.07, (Math.random() - 0.5) * 800);
        dot.rotation.x = -Math.PI / 2;
        dot.scale.setScalar(0.4 + Math.random() * 1.5);
        bgCircuitGroup.add(dot);
    }

    // \u2500\u2500 IC CHIP COMPONENT PADS (dark rectangles with glowing neon edges) \u2500\u2500
    const chipBodyMat = new THREE.MeshBasicMaterial({ color: 0x000d1a, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 80; i++) {
        const w = 5 + Math.random() * 20, d = 5 + Math.random() * 20;
        const chip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), chipBodyMat);
        chip.position.set((Math.random() - 0.5) * 700, 0.15, (Math.random() - 0.5) * 700);
        const edgeMat = Math.random() > 0.75
            ? new THREE.LineBasicMaterial({ color: 0xff5500, opacity: 0.8, transparent: true })
            : new THREE.LineBasicMaterial({ color: 0x00ffcc, opacity: 0.7, transparent: true });
        chip.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.3, d)), edgeMat));
        bgCircuitGroup.add(chip);
    }

    // ─── UTILITY: Build a PCB-style traced path with 45-degree elbows ────────────────
    function createCircuitPath(start, end) {
        const pts = [start.clone()];
        const dx = end.x - start.x;
        const dz = end.z - start.z;
        
        if (Math.abs(dx) > Math.abs(dz)) {
            // Primarily moving along X. Go straight on X first.
            const midX1 = start.x + dx * 0.3;
            pts.push(new THREE.Vector3(midX1, start.y, start.z));
            
            // 45-degree turn towards Z. X and Z must change by the same amount.
            const distZ = Math.abs(dz);
            const signX = Math.sign(dx);
            const signZ = Math.sign(dz);
            
            const midX2 = midX1 + signX * distZ;
            const midZ2 = start.z + signZ * distZ;
            pts.push(new THREE.Vector3(midX2, start.y, midZ2));
            
            // Go straight along X for remainder
            pts.push(new THREE.Vector3(end.x, start.y, end.z));
        } else {
            // Primarily moving along Z. Go straight on Z first.
            const midZ1 = start.z + dz * 0.3;
            pts.push(new THREE.Vector3(start.x, start.y, midZ1));
            
            const distX = Math.abs(dx);
            const signX = Math.sign(dx);
            const signZ = Math.sign(dz);
            
            const midX2 = start.x + signX * distX;
            const midZ2 = midZ1 + signZ * distX;
            pts.push(new THREE.Vector3(midX2, start.y, midZ2));
            
            // Go straight along Z for remainder
            pts.push(new THREE.Vector3(end.x, start.y, end.z));
        }
        
        return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.0);
    }

    // Helper: build a thick neon tube mesh along a curve
    function buildTube(curve, radius, color, opacity, segments) {
        const geo = new THREE.TubeGeometry(curve, segments || 40, radius, 5, false);

        // Taper ends: thinner at ends, thicker in middle
        const totalSegments = segments || 40;
        const radialSegments = 5;
        const positions = geo.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            const zRaw = Math.floor(i / (radialSegments + 1));
            const t = zRaw / totalSegments;

            // Taper function: 1.0 in middle, ~0.2 at ends
            const taper = 0.2 + 0.8 * Math.sin(t * Math.PI);

            // Re-scale point radially outward from the curve's core center at this t
            const pt = curve.getPoint(t);
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);

            positions.setXYZ(i,
                pt.x + (x - pt.x) * taper,
                pt.y + (y - pt.y) * taper,
                pt.z + (z - pt.z) * taper
            );
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: color,              // Base color matches the flow
            emissive: color,           // The "glow" color
            emissiveIntensity: 1.5,    // Boost to ensure it is very visibly cyan
            transparent: true,
            opacity: opacity
        });
        return new THREE.Mesh(geo, mat);
    }

    // ─── NODE ICON CARDS (3D billboard panels) ─────────────────────────────────
    const nodes = [];
    const nodeMeshes = [];
    const animatedLines = [];
    const labelsContainer = document.getElementById('labels-container');

    // Accent colors per company for variety
    const accentColors = [
        0x00aaff, 0xD4AF37, 0x00ffcc, 0xff6600, 0x9933ff,
        0x00ff88, 0xff3366, 0x33ccff, 0xffaa00, 0x44ff44,
        0xff44aa, 0x00ccff
    ];

    // FIXED POSITIONS per company — same every reload, spread across all corners
    // Coordinates: X = left(-)/right(+), Z = top(-)/bottom(+), minR=105, rangeX=600, rangeZ=380
    const fixedPositions = [
        { x: -10, z: -175 },  // 0. Pricol Limited       — top center
        { x: 160, z: -155 },  // 1. Pricol Precision     — top right
        { x: 270, z: -70 },  // 2. Pricol Engineering   — right top
        { x: 275, z: 55 },  // 3. Pricol Travel        — right bottom
        { x: 200, z: 130 },  // 4. Bluorb               — bottom right
        { x: 90, z: 75 },  // 5. Pricol Gourmet       — bottom center
        { x: -175, z: 120 },  // 6. Pricol Retreats      — bottom left
        { x: -275, z: 60 },  // 7. Pricol Durapack      — left bottom
        { x: -272, z: -65 },  // 8. Pricol Logistics     — left top
        { x: -155, z: -158 },  // 9. Pricol Asia          — top left
        { x: -100, z: 15 },  // 10.Pricol Surya         — near center (slight offset)
        { x: 115, z: -35 },  // 11.Pricol Holdings      — inner right
    ];
    const nodePositions = fixedPositions.slice(0, companies.length);

    companies.forEach((comp, i) => {
        let x = nodePositions[i].x;
        let z = nodePositions[i].z;
        if (isMobile) {
            x *= 0.38; // Squeeze horizontally so labels stay on-screen
            z *= 1.4;  // Drastically stretch vertically up and down to fill the empty top and bottom spaces
            
            // Add a little extra randomized spread to scatter them in mobile mode
            z += (Math.random() - 0.5) * 40;
            x += (Math.random() - 0.5) * 20;
        }
        const y = -1 + (Math.random() * 2);   // low to floor
        const targetPos = new THREE.Vector3(x, y, z);
        const accent = accentColors[i % accentColors.length];

        // ── 3D LOGO ICON NODE ──
        // Rings stay in Three.js for 3D glow; logo is an HTML <img> overlay
        // Minimal 3D ring in Three.js — nearly invisible, just adds depth
        // (HTML CSS .icon-glow-ring provides the main visible ring effect)
        const cardGroup = new THREE.Group();
        cardGroup.position.copy(targetPos);

        // ── HTML logo image — bare logo only, no rings/circles ──
        const logoDiv = document.createElement('div');
        logoDiv.className = 'node-label node-logo-icon';
        logoDiv.dataset.phase = Math.random() * Math.PI * 2;
        logoDiv.style.opacity = '0';          // hidden until line reaches it

        if (comp.logo) {
            const img = document.createElement('img');
            img.src = comp.logo;
            img.alt = comp.title;
            img.className = 'icon-logo-img';
            logoDiv.appendChild(img);
        }
        labelsContainer.appendChild(logoDiv);

        // Title label below the icon (also starts hidden)
        const nameDiv = document.createElement('div');
        nameDiv.className = 'node-label node-3d-title';
        nameDiv.innerHTML = `<span class="node-title-text">${comp.title}</span>`;
        nameDiv.dataset.phase = logoDiv.dataset.phase;
        nameDiv.style.opacity = '0';
        labelsContainer.appendChild(nameDiv);

        circuitGroup.add(cardGroup);


        // ── INVISIBLE RAYCAST BOX (larger hit zone) ──
        const hitBox = new THREE.Mesh(
            new THREE.BoxGeometry(16, 16, 8),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
        );
        hitBox.position.copy(targetPos);
        hitBox.userData = { isNode: true, company: comp, id: i, baseY: targetPos.y, cardGroup };
        circuitGroup.add(hitBox);
        nodeMeshes.push(hitBox);

        // ── PER-NODE POINT LIGHT — uniform soft white, not accent-colored ──
        const nodeLight = new THREE.PointLight(0x88aacc, 1.2, 55);
        nodeLight.position.copy(targetPos);
        circuitGroup.add(nodeLight);

        // ── CONNECTIVE LINES: Thick neon tubes radiating from center to icon ──
        const origin = new THREE.Vector3(0, 1, 0);
        const curve = createCircuitPath(origin, new THREE.Vector3(x, 1, z));
        const curveLength = curve.getLength();
        const tubeSegs = Math.max(20, Math.floor(curveLength / 2));

        // Outer glow halo tube
        const outerTube = buildTube(curve, 1.2, 0x00ffff, 0.4, tubeSegs);
        circuitGroup.add(outerTube);

        // Core tube (Solid current color)
        const coreTube = buildTube(curve, 0.55, 0x00ffff, 0.95, tubeSegs);
        circuitGroup.add(coreTube);

        // Secondary mid glow layer
        const midTube = buildTube(curve, 0.85, 0x00ffff, 0.7, tubeSegs);
        circuitGroup.add(midTube);

        // Electricity surge: bright bolt that slides along the path
        const surgeMat = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 3.0,
            transparent: true,
            opacity: 1.0
        });
        const surgeHolder = new THREE.Group();
        circuitGroup.add(surgeHolder);

        // Track for animate loop
        const flowData = {
            curve, curveLength, surgeMat, surgeHolder,
            offset: 0, // start from 0 for the flow effect
            active: false, // Wait until animations start
            tubes: [outerTube, coreTube, midTube],
            opacities: [0.4, 0.95, 0.7] // Original opacities to restore to
        };
        animatedLines.push(flowData);

        // Hide tubes initially for fade-in sequence
        flowData.tubes.forEach(t => {
            t.material.opacity = 0;
            t.material.transparent = true;
        });

        // Sparks removed to keep connecting lines neat and clean

        // ── SEQUENTIAL LOAD ANIMATION ──
        // Center takes 0.6s to load. Lines start shortly after.
        const stagger = i * 0.1; // Stagger each line and icon so they don't fire exactly uniformly
        const lineDelay = 0.7 + stagger; // Start lines flowing
        flowData.lineDelay = lineDelay; // synchronize the line start

        // With the speed increased (1.5), it takes ~0.66 seconds for a flow to complete a line. 
        // 0.7s baseline + 0.66s travel + stagger = icons appear exactly right as the current hits them!
        const sequenceDelay = 1.35 + stagger; // Icons pop synchronously as the current strikes 

        gsap.to(logoDiv, { opacity: 1, duration: 0.5, delay: sequenceDelay, ease: "back.out(1.5)" });
        gsap.to(nameDiv, { opacity: 1, duration: 0.5, delay: sequenceDelay + 0.1, ease: "power2.out" });
        gsap.fromTo(nodeLight, { intensity: 8 }, { intensity: 1.5, duration: 1.0, delay: sequenceDelay });

        nodes.push({
            mesh: hitBox,
            cardGroup,
            logoDiv,
            nameDiv,
            nodeLight,
            data: comp,
            accentColor: accent
        });
    });

    // ─── EXTRA RANDOM BACKGROUND TUBES ───
    // Removed to keep the area neat and prevent "downside placed lines" clashing with main nodes.
    
    // ─── RAYCASTER + INTERACTION ───────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;

    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // click on a 3D logo icon → smooth-scroll to that company's section
    window.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (hoveredNode) {
            const sectionId = hoveredNode.userData.company.id;
            const section = document.getElementById(sectionId);
            if (section) {
                // hero-3d is pinned, so offset from body top
                const heroH = document.getElementById('hero-3d').offsetHeight;
                // Calculate scroll position to place the center of the section into the center of the viewport
                const sectionCenter = heroH + section.offsetTop + (section.offsetHeight / 2);
                const viewportCenter = window.innerHeight / 2;

                window.scrollTo({
                    top: sectionCenter - viewportCenter,
                    behavior: 'smooth'
                });
            }
        } else {
            // Reset to default top-down 3D view
            gsap.to(camera.position, { x: 0, y: 220, z: 100, duration: 1.0, ease: 'power3.inOut' });
            gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.0, ease: 'power3.inOut' });
        }
    });

    let hero3DHeight = hero3D.clientHeight;
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        hero3DHeight = hero3D.clientHeight;
        renderer.setSize(window.innerWidth, hero3DHeight);
        composer.setSize(window.innerWidth, hero3DHeight);
    });

    // ─── ANIMATION LOOP ────────────────────────────────────────────────────────
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const time = clock.getElapsedTime();
        clock.getDelta(); // consume delta

        // Electricity surge tubes: slide a Continuous Flowing bright tube along each path
        animatedLines.forEach(l => {
            if (!l.active) return;
            const speed = 1.5; // VERY fast current flow

            if (!l.finished) {
                // Advance offset continuously stopping heavily at 1.0 to make it perfectly sticky
                l.offset = Math.min(1.0, l.offset + speed * (1 / 60));

                const t0 = 0; // Starts at origin
                const t1 = l.offset; // Fills to edge

                // Clear old surge mesh
                while (l.surgeHolder.children.length) {
                    const old = l.surgeHolder.children[0];
                    old.geometry.dispose();
                    l.surgeHolder.remove(old);
                }

                if (t1 > t0 + 0.01) {
                    // Sub-curve points
                    const subPts = [];
                    // Higher detail (more steps) ensures thick tubes don't have gaps at bends
                    const steps = Math.max(48, Math.floor(t1 * 128));
                    for (let s = 0; s <= steps; s++) {
                        subPts.push(l.curve.getPoint(t0 + (t1 - t0) * (s / steps)));
                    }
                    const subCurve = new THREE.CatmullRomCurve3(subPts);

                    // Bright cyan-white core surge tube
                    const surgeGeo = new THREE.TubeGeometry(subCurve, steps, 0.55, 5, false);

                    const surgeMesh = new THREE.Mesh(surgeGeo, l.surgeMat);
                    l.surgeHolder.add(surgeMesh);

                    // Outer electric glow bloom — thicker to ensure visibility
                    const glowSurgeGeo = new THREE.TubeGeometry(subCurve, steps, 1.6, 5, false);
                    const glowSurgeMat = new THREE.MeshStandardMaterial({
                        color: 0x000000,
                        emissive: 0x7DF9FF,
                        emissiveIntensity: 5.0, // High intensity for a solid look
                        transparent: true,
                        opacity: 0.8
                    });
                    const glowSurgeMesh = new THREE.Mesh(glowSurgeGeo, glowSurgeMat);
                    l.surgeHolder.add(glowSurgeMesh);
                }

                if (l.offset >= 1.0) l.finished = true; // Optimization: Line statically frozen fully lit
            }

            // Flicker: like electric discharge (keeps the fully drawn mesh looking alive and charged)

            // Flicker: like electric discharge
            l.surgeMat.opacity = 0.85 + Math.sin(Date.now() * 0.05) * 0.15;
            l.surgeMat.emissive.setHex(Math.sin(Date.now() * 0.02) > 0.3 ? 0xffffff : 0x00ffff);
        });

        // Flat chip group bob
        chipGroup.position.y = Math.sin(time * 0.8) * 0.3;
        orbitRing.rotation.z = time * 0.2;


        // Raycasting
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes);
        const found = intersects.length > 0 ? intersects[0].object : null;

        if (found !== hoveredNode) {
            // Restore previous node
            if (hoveredNode) {
                const prev = nodes.find(n => n.mesh === hoveredNode);
                if (prev) {
                    gsap.to(prev.cardGroup.scale, { x: 1, y: 1, z: 1, duration: 0.3 });
                    prev.nodeLight.intensity = 1.5;
                    prev.logoDiv.classList.remove('hovered');
                }
            }
            hoveredNode = found;
            if (hoveredNode) {
                const cur = nodes.find(n => n.mesh === hoveredNode);
                if (cur) {
                    gsap.to(cur.cardGroup.scale, { x: 1.15, y: 1.15, z: 1.15, duration: 0.3 });
                    cur.nodeLight.intensity = 5;
                    cur.logoDiv.classList.add('hovered');
                }
                hero3D.style.cursor = 'pointer';
            } else {
                hero3D.style.cursor = 'default';
            }
        }

        // Animate each node
        nodes.forEach((node) => {
            const phase = parseFloat(node.nameDiv.dataset.phase);
            const floatOffset = Math.sin(time * 1.8 + phase) * 2.2;

            // Float the 3D ring group + hitBox + light together
            node.cardGroup.position.y = node.mesh.userData.baseY + floatOffset;
            node.mesh.position.y = node.mesh.userData.baseY + floatOffset;
            node.nodeLight.position.y = node.mesh.userData.baseY + floatOffset;

            // Billboard: rings always face camera
            node.cardGroup.lookAt(camera.position);
            // Gentle Z wobble
            node.cardGroup.rotateZ(Math.sin(time * 0.4 + phase) * 0.005);

            // ── Project HTML logo image to screen ──
            const iconPos = new THREE.Vector3(
                node.mesh.position.x,
                node.mesh.userData.baseY + floatOffset,
                node.mesh.position.z
            );
            iconPos.applyMatrix4(circuitGroup.matrixWorld);
            iconPos.project(camera);
            if (iconPos.z < 1 && iconPos.z > -1) {
                const ix = (iconPos.x * 0.5 + 0.5) * window.innerWidth;
                const iy = (iconPos.y * -0.5 + 0.5) * hero3DHeight;
                node.logoDiv.style.transform = `translate(-50%, -50%) translate(${ix}px, ${iy}px)`;
                node.logoDiv.classList.add('visible');
            } else {
                node.logoDiv.classList.remove('visible');
            }

            // ── Project name label — placed below the icon on screen ──
            // Use a slight Y offset below the icon's screen position
            const labelPos = new THREE.Vector3(
                node.mesh.position.x, node.mesh.userData.baseY + floatOffset - 8, node.mesh.position.z
            );
            labelPos.applyMatrix4(circuitGroup.matrixWorld);
            labelPos.project(camera);

            // Always show name label when icon is visible (clamp to screen edges)
            const lsxRaw = (labelPos.x * 0.5 + 0.5) * window.innerWidth;
            const lsyRaw = (labelPos.y * -0.5 + 0.5) * hero3DHeight;
            // Clamp so labels at the very edge don't disappear
            const lsx = Math.min(Math.max(lsxRaw, 80), window.innerWidth - 80);
            const lsy = Math.min(Math.max(lsyRaw, 20), hero3DHeight - 20);
            if (labelPos.z < 1 && labelPos.z > -1) {
                node.nameDiv.style.transform = `translate(-50%, 0) translate(${lsx}px, ${lsy}px)`;
                node.nameDiv.classList.add('visible');
            } else {
                node.nameDiv.classList.remove('visible');
            }
        });

        // Center logo — fixed ON the chip top surface (Y=2.9, very flat)
        const chipTopPos = new THREE.Vector3(0, 2.9 + chipGroup.position.y, 0);
        chipTopPos.applyMatrix4(circuitGroup.matrixWorld);
        chipTopPos.project(camera);
        if (chipTopPos.z < 1 && chipTopPos.z > -1) {
            const cx = (chipTopPos.x * 0.5 + 0.5) * window.innerWidth;
            const cy = (chipTopPos.y * -0.5 + 0.5) * hero3DHeight;
            centerLogoWrap.style.transform = `translate(-50%, -50%) translate(${cx}px, ${cy}px)`;
            centerLogoWrap.classList.add('visible');
        } else {
            centerLogoWrap.classList.remove('visible');
        }

        controls.update();
        composer.render();
    }

    // Entry animations
    // Center logo loads FAST first
    gsap.from(chipGroup.scale, { x: 0, y: 0, z: 0, duration: 0.7, ease: 'back.out(1.5)' });
    gsap.from(orbitRing.scale, { x: 0, y: 0, z: 0, duration: 0.7, delay: 0.1, ease: 'back.out(1.5)' });
    centerLogoWrap.style.opacity = '0';
    gsap.to(centerLogoWrap, { opacity: 1, duration: 0.5, delay: 0.2, ease: 'power2.inOut' });

    // 1. Draw circuit dashed lines rapidly without GSAP warnings
    let dashProxy = { offset: 2000 };
    gsap.to(dashProxy, {
        offset: 0,
        duration: 1.5,
        ease: "power2.out",
        delay: 0.5, // start flowing shortly after center
        onUpdate: () => {
            bgTeal1.dashOffset = dashProxy.offset;
            bgTeal2.dashOffset = dashProxy.offset;
            bgCyan.dashOffset = dashProxy.offset;
            bgDim.dashOffset = dashProxy.offset;
            bgOrange.dashOffset = dashProxy.offset;
            bgRed.dashOffset = dashProxy.offset;
        }
    });

    // 2. Fade in connecting tubes, then start surge
    animatedLines.forEach((lineData) => {
        const startDelay = lineData.lineDelay !== undefined ? lineData.lineDelay : 0.7;

        // Fade in the wire base lines
        lineData.tubes.forEach((t, i) => {
            gsap.to(t.material, {
                opacity: lineData.opacities[i],
                duration: 0.4,
                delay: startDelay,
                ease: "power2.out"
            });
        });

        // Start the flowing surge shortly after wires appear
        gsap.delayedCall(startDelay + 0.2, () => {
            lineData.active = true;
            if (lineData.sparks) {
                gsap.to(lineData.sparks.material, { opacity: 0.8, duration: 1.0 });
            }
        });
    });

    animate();
}

function initGSAP() {
    const svg = document.querySelector("#motionPath");
    const path = document.querySelector("#path");
    const container = document.querySelector(".content-container");

    function resizePath() {
        const width = window.innerWidth;
        const height = container.scrollHeight;
        const center = width / 2;

        svg.setAttribute("width", width);
        svg.setAttribute("height", height);

        const hero3DHeight = document.getElementById('hero-3d').offsetHeight;
        let startX = center;
        let startY = 0; // Starts exactly at the top edge of content

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.style.top = "0px";
        svg.style.height = height + "px";

        // Fallback for getting symbol dimensions for path offset
        const size = 110;
        const trackerImg = document.querySelector("#tracker image");
        const clipCircle = document.querySelector("#circle-clip circle");

        if (trackerImg) {
            trackerImg.setAttribute("width", size);
            trackerImg.setAttribute("height", size);
            trackerImg.setAttribute("x", -size / 2);
            trackerImg.setAttribute("y", -size / 2);
            if (clipCircle) clipCircle.setAttribute("r", size / 2);
        }

        const trackerText = document.getElementById("tracker-text");
        if (trackerText) {
            // Default: text to the right
            trackerText.setAttribute("x", (size / 2) + 12);
            trackerText.setAttribute("y", size * 0.1);
            trackerText.style.textAlign = "start";
        }

        const isMobile = window.innerWidth <= 768;
        const sections = document.querySelectorAll("section.company");
        let points = [{ x: startX, y: startY }];

        sections.forEach((section) => {
            const centerY = section.offsetTop + (section.offsetHeight / 2);
            let targetX = center;

            if (section.classList.contains('left')) {
                // Card is on LEFT side -> Move tracker to the RIGHT side (opposite)
                targetX = isMobile ? width * 0.92 : width * 0.82;
            } else if (section.classList.contains('right')) {
                // Card is on RIGHT side -> Move tracker to the LEFT side (opposite)
                targetX = isMobile ? width * 0.08 : width * 0.18;
            } else {
                targetX = center;
            }
            points.push({ x: targetX, y: centerY });
        });

        const footer = document.querySelector(".footer");
        const stopY = footer ? footer.offsetTop + (footer.offsetHeight / 2) : height;
        points.push({ x: center, y: stopY });

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const cp1x = p1.x;
            const cp1y = p1.y + (p2.y - p1.y) / 2;
            const cp2x = p2.x;
            const cp2y = p1.y + (p2.y - p1.y) / 2;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        path.setAttribute("d", d);

        ScrollTrigger.refresh();
        setupAnimations();
    }

    function forceResize() {
        resizePath();
        setTimeout(resizePath, 500);
    }

    function setupAnimations() {
        gsap.killTweensOf("#tracker");
        gsap.killTweensOf("#path");
        gsap.killTweensOf("#tracker-text");

        // Hide path and tracker dynamically until it officially enters from the center logo
        gsap.set(["#tracker", "#path", "#tracker-text"], { opacity: 0 });

        ScrollTrigger.create({
            trigger: ".content-container",
            start: "top center", // Precisely when startY=0 hits the 3D logo in viewport
            end: "bottom bottom", // "bottom bottom" ensures scrub finishes when the page ends
            onEnter: () => gsap.to(["#tracker", "#path", "#tracker-text"], { opacity: 1, duration: 0.4 }),
            onLeaveBack: () => gsap.to(["#tracker", "#path", "#tracker-text"], { opacity: 0, duration: 0.3 })
        });

        gsap.to("#tracker", {
            motionPath: {
                path: "#path",
                align: "#path",
                alignOrigin: [0.5, 0.5],
                autoRotate: false
            },
            ease: "none",
            scrollTrigger: {
                trigger: ".content-container",
                start: "top center",
                end: "bottom bottom", // changed from "bottom center" to ensure it reaches 100% path at bottom of page
                scrub: 1
            }
        });

        const trackerText = document.getElementById("tracker-text");

        const sectionData = {
            'intro': { title: 'Pricol', logo: 'images/logo_icon.png' },
            'pricol-limited': { title: 'Pricol Limited', logo: 'images/logos/limited-removebg-preview.png' },
            'pricol-precision': { title: 'Pricol Precision', logo: 'images/logos/Make_the_round_202602041755-removebg-preview.png' },
            'pricol-engineering': { title: 'Pricol Engineering', logo: 'images/logos/Engineering-removebg-preview.png' },
            'pricol-travel': { title: 'Pricol Travel', logo: 'images/logos/Travel-removebg-preview.png' },
            'bluorb': { title: 'Bluorb', logo: 'images/logos/Make_the_outer_202602041748-removebg-preview.png' },
            'pricol-gourmet': { title: 'Pricol Gourmet', logo: 'images/logos/Only_inside_the_202602041759-removebg-preview.png' },
            'pricol-retreats': { title: 'Pricol Retreats', logo: 'images/logos/The_last_blue_202602050935-removebg-preview.png' },
            'pricol-durapack': { title: 'Pricol Durapack', logo: 'images/logos/The_last_blue_202602050939-removebg-preview.png' },
            'pricol-logistics': { title: 'Pricol Logistics', logo: 'images/logos/The_last_blue_202602050946-removebg-preview.png' },
            'pricol-asia': { title: 'Pricol Asia', logo: 'images/logos/Asia-removebg-preview.png' },
            'pricol-surya': { title: 'Pricol Surya', logo: 'images/logos/Surya-removebg-preview.png' },
            'pricol-holdings-section': { title: 'Pricol Holdings', logo: 'images/logos/The_last_blue_202602050947-removebg-preview.png' },
            'footer': { title: 'Pricol', logo: 'images/logo.png' }
        };

        const trackerImage = document.querySelector("#tracker image");

        Object.keys(sectionData).forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                ScrollTrigger.create({
                    trigger: section,
                    start: "top center",
                    end: "bottom center",
                    onEnter: () => {
                        trackerText.textContent = sectionData[id].title;
                        if (trackerImage) {
                            trackerImage.setAttribute("href", sectionData[id].logo);
                        }
                    },
                    onEnterBack: () => {
                        trackerText.textContent = sectionData[id].title;
                        if (trackerImage) {
                            trackerImage.setAttribute("href", sectionData[id].logo);
                        }
                    }
                });
            }
        });

        const pathLength = path.getTotalLength();
        path.style.strokeDasharray = pathLength;
        path.style.strokeDashoffset = pathLength;

        gsap.to(path, {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
                trigger: ".content-container",
                start: "top center",
                end: "bottom center",
                scrub: 1
            }
        });
    }

    window.addEventListener("load", forceResize);
    window.addEventListener("resize", () => {
        clearTimeout(window.resizedFinished);
        window.resizedFinished = setTimeout(resizePath, 250);
    });

    const sections = document.querySelectorAll(".company");
    sections.forEach(section => {
        const card = section.querySelector(".card");
        if (card) {
            let xVal = 0; let yVal = 0;
            if (section.classList.contains('left')) { xVal = -100; }
            else if (section.classList.contains('right')) { xVal = 100; }
            else { yVal = 50; }

            gsap.from(card, {
                x: xVal, y: yVal, opacity: 0, duration: 1, ease: "power3.out",
                scrollTrigger: { trigger: section, start: "top 75%", toggleActions: "play none none reverse" }
            });
        }
    });

    gsap.to(".scroll-indicator", { scrollTrigger: { trigger: "#hero-3d", start: "top top", end: "15% top", scrub: true }, opacity: 0 });

    // Smooth transition from 3D Hero to the first section
    gsap.to("#hero-3d", {
        scrollTrigger: {
            trigger: "#hero-3d",
            start: "top top",
            end: "+=100%", // Parallax overlay duration
            scrub: true,
            pin: true,
            pinSpacing: false // Allows the first company section to slide beautifully OVER the fading 3D background
        },
        autoAlpha: 0
    });

    // Handle old canvas bg functionality which we keep exactly as it was underneath for the old 2D effect.
    initBackgroundSystem();
}

function initBackgroundSystem() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    const bgState = { r: 13, g: 17, b: 23, connectDistance: 100, particleSpeed: 0.5, particleCount: 60 };

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        initParticles();
    }

    class Particle {
        constructor() {
            this.x = Math.random() * width; this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * bgState.particleSpeed; this.vy = (Math.random() - 0.5) * bgState.particleSpeed;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = `rgba(${bgState.r + 40}, ${bgState.g + 40}, ${bgState.b + 40}, 0.5)`;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    function initParticles() {
        particles = [];
        const count = window.innerWidth < 768 ? 30 : bgState.particleCount;
        for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach((p, index) => {
            p.update(); p.draw();
            for (let j = index + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x; const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bgState.connectDistance) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(255,255,255, ${0.1 - dist / bgState.connectDistance * 0.1})`;
                    ctx.lineWidth = 1; ctx.moveTo(p.x, p.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                }
            }
        });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize(); animate();

    const themes = {
        'intro': { r: 13, g: 17, b: 23 },
        'pricol-limited': { r: 0, g: 40, b: 80 },
        'pricol-precision': { r: 50, g: 50, b: 60 },
        'pricol-engineering': { r: 60, g: 30, b: 10 },
        'pricol-logistics': { r: 0, g: 50, b: 60 },
        'pricol-travel': { r: 20, g: 60, b: 30 },
        'bluorb': { r: 10, g: 30, b: 60 },
        'pricol-gourmet': { r: 60, g: 10, b: 10 },
        'pricol-retreats': { r: 20, g: 40, b: 20 },
        'pricol-durapack': { r: 40, g: 40, b: 50 },
        'pricol-asia': { r: 50, g: 40, b: 20 },
        'pricol-surya': { r: 60, g: 50, b: 20 },
        'pricol-holdings-section': { r: 10, g: 20, b: 30 },
        'footer': { r: 5, g: 5, b: 5 }
    };

    Object.keys(themes).forEach(id => {
        const section = document.getElementById(id) || document.querySelector(`.${id}`);
        if (section) {
            ScrollTrigger.create({
                trigger: section, start: "top center", end: "bottom center",
                onEnter: () => { gsap.to(bgState, { ...themes[id], duration: 1 }); updateImage(id); },
                onEnterBack: () => { gsap.to(bgState, { ...themes[id], duration: 1 }); updateImage(id); }
            });
        }
    });

    ScrollTrigger.create({
        trigger: "#footer", start: "top 85%", end: "bottom bottom",
        onEnter: () => { gsap.to(["#path", "#tracker", "#tracker-text"], { opacity: 0, duration: 0.5 }); },
        onLeaveBack: () => { gsap.to(["#path", "#tracker", "#tracker-text"], { opacity: 1, duration: 0.5 }); }
    });

    function updateImage(id) {
        document.querySelectorAll('.bg-img').forEach(el => el.classList.remove('active'));
        let targetId = `bg-${id}`;
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.add('active');
    }
}
