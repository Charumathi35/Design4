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
            window.scrollTo({
                top: firstCompany.offsetTop,
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
        companies.push({
            id: sec.id,
            title: sec.querySelector('h2').innerText,
            logo: logoImg ? logoImg.src : '',
            html: sec.querySelector('.card').innerHTML,
            index: index
        });
    });

    // Initialize Three.js Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050a15);
    scene.fog = new THREE.FogExp2(0x050a15, 0.005);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Lower flat angle matched to image
    camera.position.set(0, 30, 130);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    // Bind size to the hero-3d container height, not full window if it were different, but hero is 100vh
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 300;
    controls.minDistance = 20;
    controls.enableZoom = false; // Disable scroll-to-zoom to let page scroll work natively
    controls.enablePan = false;  // Keep it centered

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(50, 100, 50);
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x00aaff, 3, 200);
    blueLight.position.set(0, 20, 0);
    scene.add(blueLight);

    const circuitGroup = new THREE.Group();
    scene.add(circuitGroup);

    // Center Node (CPU)
    const cpuGeo = new THREE.BoxGeometry(16, 4, 16);
    const cpuMat = new THREE.MeshPhongMaterial({
        color: 0x111111,
        emissive: 0x002255,
        specular: 0x00ffff,
        shininess: 100
    });
    const cpu = new THREE.Mesh(cpuGeo, cpuMat);
    circuitGroup.add(cpu);

    // Decoration around center CPU
    const cpuRingGeo = new THREE.RingGeometry(14, 15, 32);
    const cpuRingMat = new THREE.MeshBasicMaterial({ color: 0x00aaff, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const cpuRing = new THREE.Mesh(cpuRingGeo, cpuRingMat);
    cpuRing.rotation.x = Math.PI / 2;
    cpuRing.position.y = -1;
    circuitGroup.add(cpuRing);

    // Floating UI Logo (Using HTML to fix local CORS issues)
    const centerLogoWrap = document.createElement('div');
    centerLogoWrap.className = 'node-label center-logo-wrap';
    centerLogoWrap.style.background = 'transparent';
    centerLogoWrap.style.border = 'none';
    centerLogoWrap.style.padding = '0';

    const centerLogoImg = document.createElement('img');
    centerLogoImg.src = 'images/logo_v2.png';
    centerLogoImg.style.width = '140px';
    centerLogoImg.style.opacity = '0.85';
    centerLogoImg.style.filter = 'drop-shadow(0 0 10px rgba(0, 170, 255, 0.4))';
    centerLogoWrap.appendChild(centerLogoImg);
    document.getElementById('labels-container').appendChild(centerLogoWrap);

    // Base Grid and 3D Circuit Background
    const gridHelper = new THREE.GridHelper(500, 100, 0x003366, 0x000a1a);
    gridHelper.position.y = -3;
    circuitGroup.add(gridHelper);

    // Floor Plane
    const planeGeo = new THREE.PlaneGeometry(800, 800);
    const planeMat = new THREE.MeshPhongMaterial({ color: 0x020408, depthWrite: false });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -4;
    circuitGroup.add(plane);

    // Decorative Circuit traces (Motherboard look)
    const bgCircuitGroup = new THREE.Group();
    bgCircuitGroup.position.y = -2.9;
    circuitGroup.add(bgCircuitGroup);

    const bgLineMat = new THREE.LineBasicMaterial({ color: 0x0033aa, opacity: 0.5, transparent: true });
    const padMat = new THREE.MeshPhongMaterial({ color: 0x050a15, emissive: 0x002266, specular: 0x00ffff, shininess: 50 });
    const padGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 16);
    const viaGeo = new THREE.RingGeometry(0.4, 0.8, 16);
    const viaMat = new THREE.MeshBasicMaterial({ color: 0x0055ff, side: THREE.DoubleSide, opacity: 0.7, transparent: true });

    // Reduced loop from 200 to 120 for serious lag reduction and cleaner background
    for (let i = 0; i < 120; i++) {
        let x = (Math.random() - 0.5) * 450;
        let z = (Math.random() - 0.5) * 450;
        let pts = [new THREE.Vector3(x, 0, z)];

        let segments = Math.floor(Math.random() * 5) + 1;
        for (let j = 0; j < segments; j++) {
            if (Math.random() > 0.5) {
                x += (Math.random() - 0.5) * 60;
            } else {
                z += (Math.random() - 0.5) * 60;
            }
            pts.push(new THREE.Vector3(x, 0, z));
        }

        const bLineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const bLine = new THREE.Line(bLineGeo, bgLineMat);
        bgCircuitGroup.add(bLine);

        const isViaStart = Math.random() > 0.5;
        const pad1 = new THREE.Mesh(isViaStart ? viaGeo : padGeo, isViaStart ? viaMat : padMat);
        pad1.position.copy(pts[0]);
        if (isViaStart) { pad1.rotation.x = -Math.PI / 2; pad1.position.y += 0.05; }
        bgCircuitGroup.add(pad1);

        const isViaEnd = Math.random() > 0.5;
        const pad2 = new THREE.Mesh(isViaEnd ? viaGeo : padGeo, isViaEnd ? viaMat : padMat);
        pad2.position.copy(pts[pts.length - 1]);
        if (isViaEnd) { pad2.rotation.x = -Math.PI / 2; pad2.position.y += 0.05; }
        bgCircuitGroup.add(pad2);
    }

    const microchipGeo1 = new THREE.BoxGeometry(3, 0.6, 3);
    const microchipGeo2 = new THREE.BoxGeometry(2, 0.4, 4);
    const microchipMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, emissive: 0x000511, specular: 0x222222, shininess: 80 });

    for (let i = 0; i < 60; i++) {
        const x = (Math.random() - 0.5) * 400;
        const z = (Math.random() - 0.5) * 400;
        const useGeo1 = Math.random() > 0.5;
        const chip = new THREE.Mesh(useGeo1 ? microchipGeo1 : microchipGeo2, microchipMat);
        chip.position.set(x, 0.3, z);
        if (Math.random() > 0.5) chip.rotation.y = Math.PI / 2;
        bgCircuitGroup.add(chip);
    }

    // Arrays to hold dynamics
    const nodes = [];
    const animatedLines = [];
    const labelsContainer = document.getElementById('labels-container');

    function createCircuitPath(start, end) {
        const pts = [start];
        let current = start.clone();
        // Travel out from CPU along the floor
        if (Math.random() > 0.5) {
            current = current.clone(); current.x = end.x; pts.push(current);
            current = current.clone(); current.z = end.z; pts.push(current);
        } else {
            current = current.clone(); current.z = end.z; pts.push(current);
            current = current.clone(); current.x = end.x; pts.push(current);
        }

        // Final segment goes straight UP to exactly connect to the base of the floating chip
        if (Math.abs(end.y - start.y) > 0.1) {
            current = current.clone();
            current.y = end.y;
            pts.push(current);
        }

        const path = new THREE.CurvePath();
        for (let i = 0; i < pts.length - 1; i++) {
            if (pts[i].distanceTo(pts[i + 1]) > 0.1) {
                path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
            }
        }
        return { path, pts };
    }

    companies.forEach((comp, i) => {
        const angle = (i / companies.length) * Math.PI * 2;
        const radius = 60 + Math.random() * 20; // Reduced radius significantly so they don't move off screen
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 30; // Reduced vertical spread
        const targetPos = new THREE.Vector3(x, y, z);

        const chipGeo = new THREE.BoxGeometry(8, 8, 8); // Invisible hit-box for raycasting
        const chipMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }); // Fully invisible 3D box
        const chip = new THREE.Mesh(chipGeo, chipMat);
        chip.position.copy(targetPos);
        chip.userData = { isNode: true, company: comp, id: i, baseY: targetPos.y };
        circuitGroup.add(chip);

        const startPos = new THREE.Vector3(x > 0 ? 8 : -8, 0, z > 0 ? 8 : -8);
        const circuit = createCircuitPath(startPos, targetPos);

        const lineGeo = new THREE.BufferGeometry().setFromPoints(circuit.pts);

        // Background track (darker continuous line)
        const trackMat = new THREE.LineBasicMaterial({ color: 0x00aaff, opacity: 0.2, transparent: true });
        const trackLine = new THREE.Line(lineGeo, trackMat);
        circuitGroup.add(trackLine);

        // Continuous Flowing Spark Line (Electric Current)
        const sparkMat = new THREE.LineDashedMaterial({
            color: 0x00ffff,
            dashSize: 10,
            gapSize: 30,
            opacity: 0.9,
            transparent: true
        });
        const sparkLine = new THREE.Line(lineGeo, sparkMat);
        sparkLine.computeLineDistances();
        circuitGroup.add(sparkLine);

        // Core bright spark for contrast
        const coreMat = new THREE.LineDashedMaterial({
            color: 0xffffff,
            dashSize: 2,
            gapSize: 38,
            opacity: 1,
            transparent: true
        });
        const coreLine = new THREE.Line(lineGeo, coreMat);
        coreLine.computeLineDistances();
        circuitGroup.add(coreLine);

        animatedLines.push({ mesh: sparkLine, speed: 0.15 + Math.random() * 0.1 });
        animatedLines.push({ mesh: coreLine, speed: 0.15 + Math.random() * 0.1 });

        const label = document.createElement('div');
        label.className = 'node-label floating-logo-wrap';
        if (comp.logo) {
            const img = document.createElement('img');
            img.src = comp.logo;
            img.alt = comp.title;
            img.className = 'floating-company-logo';
            label.appendChild(img);

            const tooltip = document.createElement('div');
            tooltip.className = 'company-tooltip';
            tooltip.innerText = comp.title;
            label.appendChild(tooltip);
        } else {
            label.innerText = comp.title;
        }

        // Add random phase for floating animation
        label.dataset.phase = Math.random() * Math.PI * 2;

        labelsContainer.appendChild(label);
        nodes.push({ mesh: chip, label: label, data: comp });
    });



    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredNode = null;

    window.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const cardModal = document.getElementById('card-modal');
    const cardContent = document.getElementById('card-content');

    function showCard(comp) {
        cardContent.innerHTML = comp.html;
        cardModal.classList.add('active');
    }

    function hideCard() {
        cardModal.classList.remove('active');
        gsap.to(camera.position, { x: 0, y: 30, z: 130, duration: 1.5, ease: "power3.inOut" });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power3.inOut" });
    }

    document.getElementById('close-btn').addEventListener('click', hideCard);

    window.addEventListener('click', () => {
        if (hoveredNode) {
            showCard(hoveredNode.userData.company);
            const target = hoveredNode.position.clone();
            target.y += 15; target.z += 40;
            gsap.to(camera.position, { x: target.x, y: target.y, z: target.z, duration: 1.5, ease: "power3.inOut" });
            gsap.to(controls.target, { x: hoveredNode.position.x, y: hoveredNode.position.y, z: hoveredNode.position.z, duration: 1.5, ease: "power3.inOut" });
        } else if (!cardModal.classList.contains('active')) {
            gsap.to(camera.position, { x: 0, y: 30, z: 130, duration: 1.5, ease: "power3.inOut" });
            gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power3.inOut" });
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // Keep canvas size relative to window width but max height 100vh
        renderer.setSize(window.innerWidth, document.getElementById('hero-3d').clientHeight);
    });

    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();

        circuitGroup.rotation.y += 0.0005;

        animatedLines.forEach(l => {
            l.mesh.material.dashOffset -= l.speed;
        });

        const heroRect = document.getElementById('hero-3d').getBoundingClientRect();
        // Only trigger raycaster if mouse is over hero canvas (y > 0 and y < heroRect.height)
        if (heroRect.top <= 0 && heroRect.bottom >= 0) {
            raycaster.setFromCamera(mouse, camera);
        }

        const intersects = raycaster.intersectObjects(circuitGroup.children);
        let found = null;
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData.isNode) {
                found = intersects[i].object;
                break;
            }
        }

        if (found !== hoveredNode) {
            if (hoveredNode) hoveredNode.material.emissive.setHex(0x001144);
            hoveredNode = found;
            if (hoveredNode) {
                hoveredNode.material.emissive.setHex(0x0088ff);
                document.getElementById('hero-3d').style.cursor = 'pointer';
            } else {
                document.getElementById('hero-3d').style.cursor = 'default';
            }
        }

        const time = clock.getElapsedTime();

        nodes.forEach((node, index) => {
            const phase = parseFloat(node.label.dataset.phase);
            const floatOffset = Math.sin(time * 2 + phase) * 2; // Unique float per logo

            // Float the entire 3D node box
            node.mesh.position.y = node.mesh.userData.baseY + floatOffset;

            // Anchor the 2D logo to the static/base position of the box, so it doesn't bounce with the box
            const pos = new THREE.Vector3(node.mesh.position.x, node.mesh.userData.baseY, node.mesh.position.z);

            pos.applyMatrix4(circuitGroup.matrixWorld);
            pos.project(camera);
            if (pos.z < 1 && pos.z > -1) {
                const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
                const y = (pos.y * -0.5 + 0.5) * document.getElementById('hero-3d').clientHeight;
                node.label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y - 45}px)`;
                node.label.classList.add('visible');
            } else {
                node.label.classList.remove('visible');
            }
        });

        // Animate floating logo via HTML projection
        const floatY = 15 + Math.sin(time * 2) * 1.5; // Float height
        const logoPos = new THREE.Vector3(0, floatY, 0);
        logoPos.applyMatrix4(circuitGroup.matrixWorld);
        logoPos.project(camera);

        if (logoPos.z < 1 && logoPos.z > -1) {
            const cx = (logoPos.x * 0.5 + 0.5) * window.innerWidth;
            const cy = (logoPos.y * -0.5 + 0.5) * document.getElementById('hero-3d').clientHeight;
            centerLogoWrap.style.transform = `translate(-50%, -50%) translate(${cx}px, ${cy}px)`;
            centerLogoWrap.classList.add('visible');
        } else {
            centerLogoWrap.classList.remove('visible');
        }

        controls.update();
        renderer.render(scene, camera);
    }

    gsap.from(cpu.scale, { x: 0, y: 0, z: 0, duration: 2, ease: "elastic.out(1, 0.4)" });
    cpuRing.scale.set(0, 0, 0);
    gsap.to(cpuRing.scale, { x: 1, y: 1, z: 1, duration: 2, delay: 0.5, ease: "power3.out" });

    nodes.forEach((n, i) => {
        gsap.from(n.mesh.scale, {
            x: 0, y: 0, z: 0,
            duration: 1.5,
            delay: 1 + i * 0.1,
            ease: "back.out(1.5)"
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

        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

        const center = width / 2;

        let startX = center;
        let startY = window.innerHeight / 2; // Start exactly at the middle height of the 100vh hero section

        // Fallback for getting symbol dimensions to use for path offset
        const size = 110; // Increased size to make the side scroll icon bigger
        const trackerImg = document.querySelector("#tracker image");
        const clipCircle = document.querySelector("#circle-clip circle");

        if (trackerImg) {
            trackerImg.setAttribute("width", size);
            trackerImg.setAttribute("height", size);
            trackerImg.setAttribute("x", -size / 2);
            trackerImg.setAttribute("y", -size / 2);

            if (clipCircle) {
                clipCircle.setAttribute("r", size / 2);
            }
        }

        const trackerText = document.getElementById("tracker-text");
        if (trackerText) {
            trackerText.setAttribute("x", (size / 2) + 10);
            trackerText.setAttribute("y", size * 0.1);
        }

        const sections = document.querySelectorAll("section.company, section.footer");
        let points = [{ x: startX, y: startY }];

        sections.forEach((section) => {
            const centerY = section.offsetTop + (section.offsetHeight / 2);
            let targetX = center;

            if (section.classList.contains('intro')) {
                return;
            } else if (section.classList.contains('left')) {
                targetX = width * 0.8;
            } else if (section.classList.contains('right')) {
                targetX = width * 0.2;
            } else {
                targetX = center;
            }
            points.push({ x: targetX, y: centerY });
        });

        const footer = document.querySelector(".footer");
        const stopY = footer ? footer.offsetTop - 150 : height - 250;
        points.push({ x: center, y: stopY });

        let d = `M ${points[0].x} ${points[0].y}`;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = (i > 0) ? points[i - 1] : points[0];
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

        gsap.to("#tracker", {
            motionPath: {
                path: "#path",
                align: "#path",
                alignOrigin: [0.5, 0.5],
                autoRotate: false
            },
            ease: "none",
            scrollTrigger: {
                trigger: "body",
                start: "top top",
                end: "bottom bottom",
                scrub: 1
            }
        });

        const trackerText = document.getElementById("tracker-text");

        ScrollTrigger.create({
            trigger: "body", // Fade in tracking text when page scrolling starts
            start: "100px top",
            end: "top top",
            onEnter: () => {
                gsap.to('#tracker-text', { opacity: 1, duration: 0.5 });
            },
            onLeaveBack: () => {
                gsap.to('#tracker-text', { opacity: 0, duration: 0.5 });
            }
        });

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
                start: "top top",
                end: "bottom bottom",
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

    gsap.to(".group-companies-card", { x: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.5 });
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
