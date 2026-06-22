// Grandmaster Analytics - Core Application Logic

// Application State
let appState = {
    apiKey: localStorage.getItem('gm_gemini_api_key') || '',
    depth: parseInt(localStorage.getItem('gm_engine_depth')) || 15,
    history: JSON.parse(localStorage.getItem('gm_analysis_history')) || [],
    currentFEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    activeTurn: 'w',
    boardOrientation: 'white',
    uploadedImage: null,
    cropRect: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }, // Relative coordinates for crop window
    activeScreen: 'landing',
    engineLines: [],
    currentAnalysisDepth: 0,
    selectedLineIndex: 0
};

// Global References
let chess = null;
let stockfish = null;
let cropCanvas = null;
let cropCtx = null;
let isDraggingCrop = false;
let activeDragHandle = null; // 'tl', 'tr', 'bl', 'br' or 'move'
let dragStartPos = { x: 0, y: 0 };
let originalCropRect = null;
let uploaderImage = null; // Stored HTML Image object

// DOM Elements cache
const DOM = {
    screens: {
        landing: null,
        analysis: null,
        history: null
    },
    navLinks: null,
    mobileNavLinks: null,
    dropZone: null,
    fileInput: null,
    imagePreviewCanvas: null,
    gridSliders: {
        x: null,
        y: null,
        size: null
    },
    apiKeyInput: null,
    depthSelect: null,
    btnSaveSettings: null,
    btnInitEngine: null,
    btnProcessBoard: null,
    btnUseAI: null,
    boardContainer: null,
    evalBarFill: null,
    evalBarText: null,
    opponentName: null,
    engineLinesList: null,
    engineStatusBadge: null,
    engineStatusText: null,
    activeTurnToggle: null,
    boardOrientationToggle: null,
    historyGrid: null,
    btnCopyPGN: null,
    btnExportFEN: null
};

// Initialize Application on Window Load
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Chess Rules Engine
    chess = new Chess();

    // 2. Cache DOM elements
    cacheElements();

    // 3. Setup Navigation & Routing
    setupNavigation();

    // 4. Setup Upload & Clipboard Listeners
    setupUpload();

    // 5. Setup Settings Modal & Config
    setupSettings();

    // 6. Setup Interactive Board Controls
    setupBoardControls();

    // 7. Load History view
    renderHistory();
    
    // Check if there is an active FEN saved in state (or start new game)
    loadFEN(appState.currentFEN);
});

// Cache DOM references
function cacheElements() {
    DOM.screens.landing = document.getElementById('screen-landing');
    DOM.screens.analysis = document.getElementById('screen-analysis');
    DOM.screens.history = document.getElementById('screen-history');
    
    DOM.navLinks = document.querySelectorAll('header nav a');
    DOM.mobileNavLinks = document.querySelectorAll('nav.fixed a');
    
    DOM.dropZone = document.getElementById('drop-zone');
    DOM.fileInput = document.getElementById('file-input');
    DOM.imagePreviewCanvas = document.getElementById('image-preview-canvas');
    
    DOM.gridSliders.x = document.getElementById('grid-x');
    DOM.gridSliders.y = document.getElementById('grid-y');
    DOM.gridSliders.size = document.getElementById('grid-size');
    
    DOM.apiKeyInput = document.getElementById('settings-api-key');
    DOM.depthSelect = document.getElementById('settings-depth');
    DOM.btnSaveSettings = document.getElementById('btn-save-settings');
    
    DOM.btnInitEngine = document.getElementById('btn-init-engine');
    DOM.btnProcessBoard = document.getElementById('btn-process-board');
    DOM.btnUseAI = document.getElementById('btn-use-ai');
    
    DOM.boardContainer = document.getElementById('chessboard-container');
    DOM.evalBarFill = document.getElementById('eval-bar-fill');
    DOM.evalBarText = document.getElementById('eval-bar-text');
    DOM.opponentName = document.getElementById('opponent-name');
    DOM.engineLinesList = document.getElementById('engine-lines-list');
    DOM.engineStatusBadge = document.getElementById('engine-status-badge');
    DOM.engineStatusText = document.getElementById('engine-status-text');
    
    DOM.activeTurnToggle = document.getElementById('active-turn-toggle');
    DOM.boardOrientationToggle = document.getElementById('board-orientation-toggle');
    
    DOM.historyGrid = document.getElementById('history-grid');
    DOM.btnCopyPGN = document.getElementById('btn-copy-pgn');
    DOM.btnExportFEN = document.getElementById('btn-export-fen');
}

// Navigation Controls
function setupNavigation() {
    const handleNav = (screenName) => {
        appState.activeScreen = screenName;
        
        // Show/Hide screens
        Object.keys(DOM.screens).forEach(key => {
            if (key === screenName) {
                DOM.screens[key].classList.remove('hidden');
            } else {
                DOM.screens[key].classList.add('hidden');
            }
        });

        // Update active nav state in Header
        DOM.navLinks.forEach(link => {
            const label = link.querySelector('span:not(.material-symbols-outlined)').textContent.toLowerCase();
            if (label === (screenName === 'landing' ? 'home' : screenName)) {
                link.classList.add('text-primary', 'font-bold');
                link.classList.remove('text-on-surface-variant');
                // Ensure indicator line moves
                let indicator = link.querySelector('.absolute');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'absolute -bottom-[22px] left-0 w-full h-[2px] bg-primary';
                    link.appendChild(indicator);
                }
            } else {
                link.classList.remove('text-primary', 'font-bold');
                link.classList.add('text-on-surface-variant');
                const indicator = link.querySelector('.absolute');
                if (indicator) indicator.remove();
            }
        });

        // Update Mobile Bottom Nav Bar
        DOM.mobileNavLinks.forEach(link => {
            const label = link.querySelector('span:not(.material-symbols-outlined)').textContent.toLowerCase();
            if (label === (screenName === 'landing' ? 'home' : screenName)) {
                link.classList.add('text-primary', 'font-bold');
                link.classList.remove('text-on-surface-variant');
                let indicator = link.querySelector('.absolute');
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'absolute -top-3 w-8 h-1 bg-primary rounded-b-full';
                    link.appendChild(indicator);
                }
            } else {
                link.classList.remove('text-primary', 'font-bold');
                link.classList.add('text-on-surface-variant');
                const indicator = link.querySelector('.absolute');
                if (indicator) indicator.remove();
            }
        });

        if (screenName === 'history') {
            renderHistory();
        }
    };

    // Header Links
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.querySelector('span:not(.material-symbols-outlined)').textContent.toLowerCase();
            const target = text === 'home' ? 'landing' : text;
            handleNav(target);
        });
    });

    // Mobile Bottom Nav Links
    DOM.mobileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.querySelector('span:not(.material-symbols-outlined)').textContent.toLowerCase();
            const target = text === 'home' ? 'landing' : text;
            handleNav(target);
        });
    });
}

// Setup Settings Modal & Configuration
function setupSettings() {
    // Populate form
    DOM.apiKeyInput.value = appState.apiKey;
    DOM.depthSelect.value = appState.depth;

    DOM.btnSaveSettings.addEventListener('click', () => {
        appState.apiKey = DOM.apiKeyInput.value.trim();
        appState.depth = parseInt(DOM.depthSelect.value);

        localStorage.setItem('gm_gemini_api_key', appState.apiKey);
        localStorage.setItem('gm_engine_depth', appState.depth);

        // Hide settings modal
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.add('hidden');
        
        showToast('Settings saved successfully!');
        
        // Restart analysis if on analysis screen
        if (appState.activeScreen === 'analysis') {
            analyzePosition();
        }
    });

    // Trigger settings modal click from nav
    const settingsTriggerHeader = document.querySelector('header nav a[href="#settings"]');
    const settingsTriggerMobile = document.querySelector('nav.fixed a[href="#settings"]');
    
    const openSettings = (e) => {
        if (e) e.preventDefault();
        const modal = document.getElementById('settings-modal');
        if (modal) modal.classList.remove('hidden');
    };

    if (settingsTriggerHeader) settingsTriggerHeader.addEventListener('click', openSettings);
    if (settingsTriggerMobile) settingsTriggerMobile.addEventListener('click', openSettings);
    
    const closeBtn = document.getElementById('btn-close-settings');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('settings-modal').classList.add('hidden');
    });
}

// Drag & Drop / Copy-Paste Image Handler
function setupUpload() {
    const triggerInput = () => DOM.fileInput.click();

    DOM.dropZone.addEventListener('click', triggerInput);
    DOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.add('border-primary', 'bg-surface-container-lowest');
    });
    
    DOM.dropZone.addEventListener('dragleave', () => {
        DOM.dropZone.classList.remove('border-primary', 'bg-surface-container-lowest');
    });
    
    DOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('border-primary', 'bg-surface-container-lowest');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageFile(files[0]);
        }
    });
    
    DOM.fileInput.addEventListener('change', () => {
        if (DOM.fileInput.files.length > 0) {
            handleImageFile(DOM.fileInput.files[0]);
        }
    });

    // Clipboard Paste Listener
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file' && item.type.startsWith('image/')) {
                const blob = item.getAsFile();
                handleImageFile(blob);
                break;
            }
        }
    });

    // Grid Editor Setup
    cropCanvas = DOM.imagePreviewCanvas;
    cropCtx = cropCanvas.getContext('2d');
    
    // Wire sliders
    DOM.gridSliders.x.addEventListener('input', () => {
        appState.cropRect.x = parseFloat(DOM.gridSliders.x.value);
        redrawCropGrid();
    });
    DOM.gridSliders.y.addEventListener('input', () => {
        appState.cropRect.y = parseFloat(DOM.gridSliders.y.value);
        redrawCropGrid();
    });
    DOM.gridSliders.size.addEventListener('input', () => {
        appState.cropRect.w = parseFloat(DOM.gridSliders.size.value);
        appState.cropRect.h = parseFloat(DOM.gridSliders.size.value);
        redrawCropGrid();
    });

    // Wire canvas drag events
    cropCanvas.addEventListener('mousedown', handleCropMouseDown);
    cropCanvas.addEventListener('mousemove', handleCropMouseMove);
    window.addEventListener('mouseup', handleCropMouseUp);
    
    cropCanvas.addEventListener('touchstart', handleCropTouchStart, { passive: false });
    cropCanvas.addEventListener('touchmove', handleCropTouchMove, { passive: false });
    window.addEventListener('touchend', handleCropTouchEnd);

    // Grid Alignment controls: Detect, Reset
    DOM.btnProcessBoard.addEventListener('click', processBoardLocal);
    DOM.btnUseAI.addEventListener('click', processBoardGemini);

    DOM.btnInitEngine.addEventListener('click', () => {
        // Just switch screen to analysis with current state
        appState.activeScreen = 'analysis';
        setupNavigation();
        navigateToScreen('analysis');
        initStockfish();
        analyzePosition();
    });
}

function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        appState.uploadedImage = e.target.result;
        uploaderImage = new Image();
        uploaderImage.onload = () => {
            // Show Grid controls
            document.getElementById('grid-controls-panel').classList.remove('hidden');
            
            // Set canvas size matching the screen scale
            const containerWidth = cropCanvas.parentElement.clientWidth || 500;
            const aspect = uploaderImage.height / uploaderImage.width;
            cropCanvas.width = containerWidth;
            cropCanvas.height = containerWidth * aspect;
            
            // Reset crop rectangle to centered square
            const size = 0.75;
            appState.cropRect = {
                x: 0.125,
                y: (1 - size * aspect) / 2 > 0 ? (1 - size * aspect) / 2 : 0.1,
                w: size,
                h: size / aspect
            };

            // Set sliders
            DOM.gridSliders.x.value = appState.cropRect.x;
            DOM.gridSliders.y.value = appState.cropRect.y;
            DOM.gridSliders.size.value = appState.cropRect.w;

            redrawCropGrid();
        };
        uploaderImage.src = appState.uploadedImage;
    };
    reader.readAsDataURL(file);
}

// Redraw crop preview on Canvas
function redrawCropGrid() {
    if (!uploaderImage) return;

    const cw = cropCanvas.width;
    const ch = cropCanvas.height;
    
    cropCtx.clearRect(0, 0, cw, ch);
    
    // 1. Draw base image
    cropCtx.drawImage(uploaderImage, 0, 0, cw, ch);
    
    // 2. Draw dim overlay outside crop area
    const rx = appState.cropRect.x * cw;
    const ry = appState.cropRect.y * ch;
    const rw = appState.cropRect.w * cw;
    const rh = appState.cropRect.h * ch;
    
    cropCtx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    // Top
    cropCtx.fillRect(0, 0, cw, ry);
    // Bottom
    cropCtx.fillRect(0, ry + rh, cw, ch - (ry + rh));
    // Left
    cropCtx.fillRect(0, ry, rx, rh);
    // Right
    cropCtx.fillRect(rx + rw, ry, cw - (rx + rw), rh);
    
    // 3. Draw crop box border (Gold)
    cropCtx.strokeStyle = '#f2ca50';
    cropCtx.lineWidth = 2.5;
    cropCtx.strokeRect(rx, ry, rw, rh);
    
    // 4. Draw 8x8 Grid lines
    cropCtx.strokeStyle = 'rgba(242, 202, 80, 0.4)';
    cropCtx.lineWidth = 1;
    
    for (let i = 1; i < 8; i++) {
        // Verticals
        cropCtx.beginPath();
        cropCtx.moveTo(rx + (rw / 8) * i, ry);
        cropCtx.lineTo(rx + (rw / 8) * i, ry + rh);
        cropCtx.stroke();
        
        // Horizontals
        cropCtx.beginPath();
        cropCtx.moveTo(rx, ry + (rh / 8) * i);
        cropCtx.lineTo(rx + rw, ry + (rh / 8) * i);
        cropCtx.stroke();
    }
    
    // 5. Draw Corner drag handles
    cropCtx.fillStyle = '#f2ca50';
    const r = 8;
    const corners = [
        { x: rx, y: ry, id: 'tl' },
        { x: rx + rw, y: ry, id: 'tr' },
        { x: rx, y: ry + rh, id: 'bl' },
        { x: rx + rw, y: ry + rh, id: 'br' }
    ];
    
    corners.forEach(c => {
        cropCtx.beginPath();
        cropCtx.arc(c.x, c.y, r, 0, Math.PI * 2);
        cropCtx.fill();
        cropCtx.strokeStyle = '#121416';
        cropCtx.lineWidth = 2;
        cropCtx.stroke();
    });
}

// Canvas Drag Interactions
function handleCropMouseDown(e) {
    if (!uploaderImage) return;
    const rect = cropCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    startDrag(mx, my);
}

function handleCropMouseMove(e) {
    if (!isDraggingCrop || !uploaderImage) return;
    const rect = cropCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    performDrag(mx, my);
}

function handleCropMouseUp() {
    isDraggingCrop = false;
    activeDragHandle = null;
}

function handleCropTouchStart(e) {
    if (e.touches.length !== 1 || !uploaderImage) return;
    e.preventDefault();
    const rect = cropCanvas.getBoundingClientRect();
    const mx = e.touches[0].clientX - rect.left;
    const my = e.touches[0].clientY - rect.top;
    
    startDrag(mx, my);
}

function handleCropTouchMove(e) {
    if (!isDraggingCrop || !uploaderImage) return;
    e.preventDefault();
    const rect = cropCanvas.getBoundingClientRect();
    const mx = e.touches[0].clientX - rect.left;
    const my = e.touches[0].clientY - rect.top;
    
    performDrag(mx, my);
}

function handleCropTouchEnd() {
    isDraggingCrop = false;
    activeDragHandle = null;
}

function startDrag(mx, my) {
    const cw = cropCanvas.width;
    const ch = cropCanvas.height;
    const rx = appState.cropRect.x * cw;
    const ry = appState.cropRect.y * ch;
    const rw = appState.cropRect.w * cw;
    const rh = appState.cropRect.h * ch;
    const r = 15; // Hit radius
    
    // Check corner handles
    if (Math.hypot(mx - rx, my - ry) < r) activeDragHandle = 'tl';
    else if (Math.hypot(mx - (rx + rw), my - ry) < r) activeDragHandle = 'tr';
    else if (Math.hypot(mx - rx, my - (ry + rh)) < r) activeDragHandle = 'bl';
    else if (Math.hypot(mx - (rx + rw), my - (ry + rh)) < r) activeDragHandle = 'br';
    // Check center move
    else if (mx > rx && mx < rx + rw && my > ry && my < ry + rh) activeDragHandle = 'move';
    
    if (activeDragHandle) {
        isDraggingCrop = true;
        dragStartPos = { x: mx, y: my };
        originalCropRect = { ...appState.cropRect };
    }
}

function performDrag(mx, my) {
    const cw = cropCanvas.width;
    const ch = cropCanvas.height;
    const dx = (mx - dragStartPos.x) / cw;
    const dy = (my - dragStartPos.y) / ch;
    
    if (activeDragHandle === 'move') {
        appState.cropRect.x = Math.max(0, Math.min(1 - originalCropRect.w, originalCropRect.x + dx));
        appState.cropRect.y = Math.max(0, Math.min(1 - originalCropRect.h, originalCropRect.y + dy));
    } else {
        // Chess board must remain a square, so we force width == height * aspect
        const aspect = ch / cw;
        
        if (activeDragHandle === 'br') {
            const newW = Math.max(0.1, Math.min(1 - originalCropRect.x, originalCropRect.w + dx));
            appState.cropRect.w = newW;
            appState.cropRect.h = newW / aspect;
        } else if (activeDragHandle === 'bl') {
            const newW = Math.max(0.1, Math.min(originalCropRect.x + originalCropRect.w, originalCropRect.w - dx));
            appState.cropRect.x = originalCropRect.x + (originalCropRect.w - newW);
            appState.cropRect.w = newW;
            appState.cropRect.h = newW / aspect;
        } else if (activeDragHandle === 'tr') {
            const newW = Math.max(0.1, Math.min(1 - originalCropRect.x, originalCropRect.w + dx));
            appState.cropRect.y = originalCropRect.y + (originalCropRect.h - newW / aspect);
            appState.cropRect.w = newW;
            appState.cropRect.h = newW / aspect;
        } else if (activeDragHandle === 'tl') {
            const newW = Math.max(0.1, Math.min(originalCropRect.x + originalCropRect.w, originalCropRect.w - dx));
            appState.cropRect.x = originalCropRect.x + (originalCropRect.w - newW);
            appState.cropRect.y = originalCropRect.y + (originalCropRect.h - newW / aspect);
            appState.cropRect.w = newW;
            appState.cropRect.h = newW / aspect;
        }
    }
    
    // Sync sliders
    DOM.gridSliders.x.value = appState.cropRect.x;
    DOM.gridSliders.y.value = appState.cropRect.y;
    DOM.gridSliders.size.value = appState.cropRect.w;
    
    redrawCropGrid();
}

// -------------------------------------------------------------
// Chess board state recognition
// -------------------------------------------------------------

// Local recognition mode (Canvas classification heuristics)
function processBoardLocal() {
    if (!uploaderImage) return;

    showLoadingOverlay('Extracting board layout...');

    // Let the image draw complete, then crop
    setTimeout(() => {
        try {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            // Get original pixels based on crop rectangle
            const ox = appState.cropRect.x * uploaderImage.width;
            const oy = appState.cropRect.y * uploaderImage.height;
            const ow = appState.cropRect.w * uploaderImage.width;
            const oh = appState.cropRect.h * uploaderImage.height;
            
            tempCanvas.width = 256;
            tempCanvas.height = 256;
            
            // Draw cropped square
            tempCtx.drawImage(uploaderImage, ox, oy, ow, oh, 0, 0, 256, 256);
            
            // Detect board background colors automatically
            const colors = detectBoardColors(tempCtx);
            const colorLight = colors.colorLight;
            const colorDark = colors.colorDark;
            
            console.log("Automatically detected light square color:", colorLight);
            console.log("Automatically detected dark square color:", colorDark);

            // Process the 8x8 grid
            const cellSize = 32; // 256 / 8
            const boardRepresentation = [];
            
            for (let rank = 0; rank < 8; rank++) {
                const rankRow = [];
                for (let file = 0; file < 8; file++) {
                    const cellCanvas = document.createElement('canvas');
                    cellCanvas.width = cellSize;
                    cellCanvas.height = cellSize;
                    const cellCtx = cellCanvas.getContext('2d');
                    
                    // Draw cell
                    cellCtx.drawImage(
                        tempCanvas, 
                        file * cellSize, 
                        rank * cellSize, 
                        cellSize, 
                        cellSize, 
                        0, 0, 
                        cellSize, 
                        cellSize
                    );
                    
                    const isWhiteSquare = (rank + file) % 2 === 0;
                    const piece = classifyPieceHeuristic(cellCanvas, isWhiteSquare, colorLight, colorDark);
                    rankRow.push(piece);
                }
                boardRepresentation.push(rankRow);
            }
            
            // Assemble FEN
            const fen = boardToFEN(boardRepresentation, appState.activeTurn);
            loadFEN(fen);
            
            hideLoadingOverlay();
            
            // Auto switch to analysis dashboard
            appState.activeScreen = 'analysis';
            setupNavigation();
            navigateToScreen('analysis');
            
            initStockfish();
            analyzePosition();
            showToast('Local scan complete! Adjust pieces manually if needed.');
        } catch (e) {
            console.error(e);
            hideLoadingOverlay();
            showToast('Scan failed. Please try again or crop closer.');
        }
    }, 150);
}

// Sample corner pixels of all 64 squares to find the median light and dark square colors
function detectBoardColors(tempCtx) {
    const cellSize = 32;
    const imgData = tempCtx.getImageData(0, 0, 256, 256);
    const data = imgData.data;
    
    const lightColors = [];
    const darkColors = [];
    
    for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
            const cellX = f * cellSize;
            const cellY = r * cellSize;
            const borderOffset = 4; // Offset inwards to avoid grid lines
            
            const samples = [
                getPixel(data, cellX + borderOffset, cellY + borderOffset, 256),
                getPixel(data, cellX + cellSize - 1 - borderOffset, cellY + borderOffset, 256),
                getPixel(data, cellX + borderOffset, cellY + cellSize - 1 - borderOffset, 256),
                getPixel(data, cellX + cellSize - 1 - borderOffset, cellY + cellSize - 1 - borderOffset, 256)
            ];
            
            let rAvg = 0, gAvg = 0, bAvg = 0;
            samples.forEach(s => {
                rAvg += s.r;
                gAvg += s.g;
                bAvg += s.b;
            });
            rAvg = Math.round(rAvg / samples.length);
            gAvg = Math.round(gAvg / samples.length);
            bAvg = Math.round(bAvg / samples.length);
            
            const isLight = (r + f) % 2 === 0;
            if (isLight) {
                lightColors.push({ r: rAvg, g: gAvg, b: bAvg });
            } else {
                darkColors.push({ r: rAvg, g: gAvg, b: bAvg });
            }
        }
    }
    
    // Compute median color of all squares to ignore coordinate texts / overlays
    const getMedianColor = (colors) => {
        const rList = colors.map(c => c.r).sort((a,b) => a-b);
        const gList = colors.map(c => c.g).sort((a,b) => a-b);
        const bList = colors.map(c => c.b).sort((a,b) => a-b);
        const mid = Math.floor(colors.length / 2);
        return { r: rList[mid], g: gList[mid], b: bList[mid] };
    };
    
    return {
        colorLight: getMedianColor(lightColors),
        colorDark: getMedianColor(darkColors)
    };
}

// Convert 8x8 piece grid to FEN string
function boardToFEN(grid, activeTurn) {
    const fenRows = [];
    for (let r = 0; r < 8; r++) {
        let emptyCount = 0;
        let rowStr = '';
        for (let f = 0; f < 8; f++) {
            const piece = grid[r][f]; // e.g. "wP", "bK", null
            if (!piece) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    rowStr += emptyCount;
                    emptyCount = 0;
                }
                const type = piece.charAt(1); // P, R, N, B, Q, K
                const isWhite = piece.charAt(0) === 'w';
                rowStr += isWhite ? type.toUpperCase() : type.toLowerCase();
            }
        }
        if (emptyCount > 0) {
            rowStr += emptyCount;
        }
        fenRows.push(rowStr);
    }
    
    // Combine rows and add default castling, en passant, move counters
    return fenRows.join('/') + ` ${activeTurn} KQkq - 0 1`;
}

// Gemini API Recognition Mode
async function processBoardGemini() {
    if (!uploaderImage) return;
    if (!appState.apiKey) {
        showToast('Please enter your Gemini API key in Settings first.');
        document.getElementById('settings-modal').classList.remove('hidden');
        return;
    }

    showLoadingOverlay('AI vision scanning image (Gemini 1.5 Flash)...');
    
    try {
        const base64Data = appState.uploadedImage.split(',')[1];
        const mimeType = appState.uploadedImage.split(';')[0].split(':')[1];
        
        const prompt = `You are a grandmaster chess scanner. Identify the positions of all pieces on the board and return ONLY the FEN string representing the board state (just the board layout, e.g. "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR", without any other text, markdown, or headers). White is at the bottom, Black is at the top. Return only the FEN board layout.`;
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appState.apiKey}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: base64Data
                            }
                        }
                    ]
                }]
            })
        });
        
        const result = await response.json();
        const fenText = result.candidates[0].content.parts[0].text.trim();
        
        // Clean FEN string from model reply (remove formatting markdown if model returned it anyway)
        let cleanedFEN = fenText.replace(/```/g, '').replace(/fen/gi, '').trim();
        
        // Ensure it looks like a valid FEN grid
        if (!cleanedFEN.includes('/') || cleanedFEN.split('/').length < 8) {
            throw new Error("Invalid FEN returned by model: " + cleanedFEN);
        }
        
        // If the model returned only the layout, append activeTurn and standard castling rights
        if (cleanedFEN.split(' ').length === 1) {
            cleanedFEN += ` ${appState.activeTurn} KQkq - 0 1`;
        } else {
            // Update active turn based on Gemini's FEN if it parsed full FEN
            const parts = cleanedFEN.split(' ');
            appState.activeTurn = parts[1];
            DOM.activeTurnToggle.value = appState.activeTurn;
        }

        loadFEN(cleanedFEN);
        hideLoadingOverlay();
        
        // Auto switch to analysis
        appState.activeScreen = 'analysis';
        setupNavigation();
        navigateToScreen('analysis');
        
        initStockfish();
        analyzePosition();
        showToast('Gemini Vision scan complete!');
    } catch (e) {
        console.error(e);
        hideLoadingOverlay();
        showToast('Gemini scan failed. Falling back to local mode.');
        processBoardLocal(); // Fallback
    }
}

// -------------------------------------------------------------
// Chessboard rendering & Rule implementation
// -------------------------------------------------------------

let selectedSquare = null;
let boardEditPiece = null; // Stored piece choice for editing board

function loadFEN(fen) {
    const validated = chess.load(fen);
    if (!validated) {
        // Try correcting missing turn parts
        const corrected = fen + " w KQkq - 0 1";
        if (chess.load(corrected)) {
            appState.currentFEN = corrected;
        } else {
            console.error("Invalid FEN: ", fen);
            showToast("Invalid FEN string loaded.");
            return;
        }
    } else {
        appState.currentFEN = fen;
    }
    
    const parts = appState.currentFEN.split(' ');
    appState.activeTurn = parts[1];
    DOM.activeTurnToggle.value = appState.activeTurn;

    renderVirtualBoard();
}

// Renders our gorgeous HSL dark-themed virtual chessboard
function renderVirtualBoard() {
    DOM.boardContainer.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-8 grid-rows-8 w-full h-full relative select-none rounded';
    
    // Read orientation
    const startRank = appState.boardOrientation === 'white' ? 0 : 7;
    const endRank = appState.boardOrientation === 'white' ? 8 : -1;
    const stepRank = appState.boardOrientation === 'white' ? 1 : -1;
    
    const startFile = appState.boardOrientation === 'white' ? 0 : 7;
    const endFile = appState.boardOrientation === 'white' ? 8 : -1;
    const stepFile = appState.boardOrientation === 'white' ? 1 : -1;

    for (let r = startRank; r !== endRank; r += stepRank) {
        for (let f = startFile; f !== endFile; f += stepFile) {
            const squareName = String.fromCharCode(97 + f) + (8 - r);
            const squareDiv = document.createElement('div');
            
            // Light / Dark square colors
            const isLight = (r + f) % 2 === 0;
            // Matches HSL tokens: light = desaturated slate (#CBD5E0), dark = slate (#4A5568)
            squareDiv.className = `w-full h-full flex items-center justify-center relative cursor-pointer transition-all duration-150 ${
                isLight ? 'bg-[#CBD5E0] text-[#1A202C]' : 'bg-[#4A5568] text-[#CBD5E0]'
            }`;
            squareDiv.dataset.square = squareName;
            
            // Draw coordinates coordinates on edges
            if (appState.boardOrientation === 'white') {
                if (f === 0) { // left rank label
                    const label = document.createElement('span');
                    label.className = 'absolute top-1 left-1 font-label-mono text-[9px] opacity-75';
                    label.textContent = 8 - r;
                    squareDiv.appendChild(label);
                }
                if (r === 7) { // bottom file label
                    const label = document.createElement('span');
                    label.className = 'absolute bottom-1 right-1 font-label-mono text-[9px] opacity-75';
                    label.textContent = String.fromCharCode(97 + f);
                    squareDiv.appendChild(label);
                }
            } else {
                if (f === 7) { // right rank label
                    const label = document.createElement('span');
                    label.className = 'absolute top-1 right-1 font-label-mono text-[9px] opacity-75';
                    label.textContent = 8 - r;
                    squareDiv.appendChild(label);
                }
                if (r === 0) { // top file label
                    const label = document.createElement('span');
                    label.className = 'absolute top-1 left-1 font-label-mono text-[9px] opacity-75';
                    label.textContent = String.fromCharCode(97 + f);
                    squareDiv.appendChild(label);
                }
            }
            
            // Draw piece if exists
            const piece = chess.get(squareName);
            if (piece) {
                const img = document.createElement('img');
                const pieceCode = piece.color + piece.type.toUpperCase(); // e.g. "wP", "bR"
                img.src = PIECE_IMAGES[pieceCode];
                img.className = 'w-[82%] h-[82%] object-contain select-none transform hover:scale-105 transition-transform duration-100 relative z-10';
                img.draggable = false;
                squareDiv.appendChild(img);
            }

            // Click listener for moving pieces or editing
            squareDiv.addEventListener('click', () => handleSquareClick(squareName));

            grid.appendChild(squareDiv);
        }
    }
    
    DOM.boardContainer.appendChild(grid);
    
    // Draw arrows if a best line is selected
    drawBestMoveArrow();
}

function handleSquareClick(square) {
    const isEditMode = document.getElementById('btn-edit-mode').classList.contains('bg-primary');
    
    if (isEditMode) {
        // Edit Mode: set/delete piece
        const activeSelectPiece = document.querySelector('.piece-picker-btn.active')?.dataset.piece || null;
        
        // Modify FEN
        const board = chess.board();
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rIndex = 8 - parseInt(square.charAt(1));
        const fIndex = files.indexOf(square.charAt(0));
        
        const grid = [];
        for (let r = 0; r < 8; r++) {
            const row = [];
            for (let f = 0; f < 8; f++) {
                const sq = files[f] + (8 - r);
                if (sq === square) {
                    row.push(activeSelectPiece);
                } else {
                    const p = chess.get(sq);
                    row.push(p ? p.color + p.type.toUpperCase() : null);
                }
            }
            grid.push(row);
        }
        
        const newFen = boardToFEN(grid, appState.activeTurn);
        loadFEN(newFen);
        
        // Terminate old analysis and restart
        initStockfish();
        analyzePosition();
        return;
    }

    // Normal play mode
    if (selectedSquare === null) {
        const piece = chess.get(square);
        if (piece && piece.color === appState.activeTurn) {
            selectedSquare = square;
            // Highlight square
            const div = document.querySelector(`[data-square="${square}"]`);
            div.classList.add('ring-2', 'ring-primary', 'bg-primary/25');
            
            // Highlight target moves
            const moves = chess.moves({ square: square, verbose: true });
            moves.forEach(m => {
                const targetDiv = document.querySelector(`[data-square="${m.to}"]`);
                if (targetDiv) {
                    const dot = document.createElement('div');
                    dot.className = 'w-3 h-3 rounded-full bg-primary/45 absolute z-20 pointer-events-none';
                    targetDiv.appendChild(dot);
                }
            });
        }
    } else {
        // Double click removes highlight
        if (selectedSquare === square) {
            selectedSquare = null;
            renderVirtualBoard();
            return;
        }

        // Try to perform move
        const move = chess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q' // auto promote to queen for simplicity
        });

        selectedSquare = null;
        
        if (move) {
            // Save state and analyze next turn
            appState.currentFEN = chess.fen();
            appState.activeTurn = chess.turn();
            DOM.activeTurnToggle.value = appState.activeTurn;
            
            renderVirtualBoard();
            
            // Trigger analysis on new position
            initStockfish();
            analyzePosition();
            
            // Check for flip (if we have historical evaluation points)
            checkForBlunderFlip(move);
        } else {
            // Invalid move, try selecting new piece instead
            renderVirtualBoard();
            handleSquareClick(square);
        }
    }
}

// -------------------------------------------------------------
// Stockfish Engine Integration & Communication
// -------------------------------------------------------------

function initStockfish() {
    if (stockfish) {
        stockfish.terminate();
    }
    
    DOM.engineStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-primary animate-ping"></span> Booting';
    DOM.engineStatusText.textContent = 'Loading Stockfish.js engine...';
    
    try {
        const workerCode = `importScripts("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");`;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        stockfish = new Worker(workerUrl);
    } catch (e) {
        console.error("CORS bypass Worker failed, trying fallback direct CDN URL.", e);
        stockfish = new Worker("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
    }
    
    stockfish.addEventListener('message', handleStockfishMessage);
    stockfish.postMessage('uci');
}

function handleStockfishMessage(e) {
    const line = e.data;
    console.log("[Engine Log]", line);
    
    if (line === 'readyok') {
        DOM.engineStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-win-green animate-pulse"></span> Ready';
        DOM.engineStatusText.textContent = 'Engine ready.';
    }
    
    if (line.startsWith('option name MultiPV')) {
        // Stockfish loaded
    }
    
    // Parse PV Info lines
    if (line.startsWith('info') && line.includes('multipv')) {
        parseEngineInfoLine(line);
    }
}

function parseEngineInfoLine(line) {
    const multipvMatch = line.match(/multipv\s+(\d+)/);
    if (!multipvMatch) return;
    
    const pvIndex = parseInt(multipvMatch[1]) - 1; // 0 to 5
    
    // Parse Depth
    const depthMatch = line.match(/depth\s+(\d+)/);
    if (depthMatch) {
        appState.currentAnalysisDepth = parseInt(depthMatch[1]);
        document.getElementById('engine-depth-display').textContent = `${appState.currentAnalysisDepth}/${appState.depth}`;
    }

    // Parse Score
    let scoreText = '0.00';
    let scoreValue = 0;
    
    const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
    
    if (cpMatch) {
        const cp = parseInt(cpMatch[1]);
        // Centipawn from side-to-move's perspective
        const turnMultiplier = appState.activeTurn === 'w' ? 1 : -1;
        scoreValue = (cp * turnMultiplier) / 100;
        scoreText = (scoreValue > 0 ? '+' : '') + scoreValue.toFixed(2);
    } else if (mateMatch) {
        const mate = parseInt(mateMatch[1]);
        const turnMultiplier = appState.activeTurn === 'w' ? 1 : -1;
        const adjustedMate = mate * turnMultiplier;
        scoreValue = adjustedMate > 0 ? 1000 + adjustedMate : -1000 + adjustedMate;
        scoreText = `M${Math.abs(mate)}`;
    }
    
    // Parse PV moves (UCI format)
    const pvMatch = line.match(/\bpv\s+(.+)$/);
    if (pvMatch) {
        const uciMoves = pvMatch[1].split(' ');
        const sanMoves = convertUciToSan(uciMoves);
        
        appState.engineLines[pvIndex] = {
            scoreText,
            scoreValue,
            pv: sanMoves,
            uci: uciMoves,
            depth: appState.currentAnalysisDepth
        };
        
        updateEngineLinesUI();
    }
}

function convertUciToSan(uciMoves) {
    const tempChess = new Chess(chess.fen());
    const sanMoves = [];
    for (let uci of uciMoves) {
        const from = uci.substring(0, 2);
        const to = uci.substring(2, 4);
        const promotion = uci.length > 4 ? uci.charAt(4) : undefined;
        
        const move = tempChess.move({ from, to, promotion });
        if (move) {
            sanMoves.push(move.san);
        } else {
            sanMoves.push(uci); // Fallback
        }
    }
    return sanMoves;
}

function analyzePosition() {
    if (!stockfish) return;
    
    appState.engineLines = [];
    appState.currentAnalysisDepth = 0;
    
    // Stop engine and prepare
    stockfish.postMessage('stop');
    stockfish.postMessage('isready');
    stockfish.postMessage('setoption name MultiPV value 6');
    stockfish.postMessage(`position fen ${appState.currentFEN}`);
    stockfish.postMessage(`go depth ${appState.depth}`);
    
    DOM.engineStatusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#E53E3E] animate-pulse"></span> Analyzing';
    DOM.engineStatusText.textContent = 'Computing optimal variations...';
}

// -------------------------------------------------------------
// UI Updates & Interactions
// -------------------------------------------------------------

function updateEngineLinesUI() {
    DOM.engineLinesList.innerHTML = '';
    
    // Render lines in order
    for (let i = 0; i < 6; i++) {
        const line = appState.engineLines[i];
        if (!line) continue;
        
        const isBestLine = i === 0;
        const button = document.createElement('button');
        
        // If it's a blunder/heavy disadvantage, color red
        const isLoss = line.scoreValue < -2.0;
        const colorClass = isBestLine 
            ? 'border-l-primary border-l-2 text-primary bg-surface-container' 
            : isLoss 
                ? 'border-l-loss-red border-l-2 text-[#E53E3E] bg-surface-container'
                : 'border-transparent text-on-surface hover:border-surface-gray';
                
        const badgeBg = isBestLine 
            ? 'bg-surface-container-highest text-primary font-bold' 
            : isLoss 
                ? 'bg-[#3A1C1C] text-loss-red'
                : 'bg-surface-container-highest text-on-surface-variant';

        button.className = `w-full text-left bg-surface-container hover:bg-surface-variant transition-all duration-150 p-3 rounded flex items-center gap-3 group border ${colorClass} cursor-pointer`;
        if (appState.selectedLineIndex === i) {
            button.classList.add('ring-1', 'ring-primary/45');
        }

        // Moves string
        let movesHtml = '';
        line.pv.slice(0, 5).forEach((m, idx) => {
            const moveNum = Math.floor(idx / 2) + 1;
            const isWhite = idx % 2 === 0;
            if (isWhite) {
                movesHtml += `<span class="text-on-surface-variant/75 mr-0.5">${moveNum}.</span><span class="${isBestLine ? 'text-primary font-bold' : 'text-on-surface'} hover:underline mr-2">${m}</span>`;
            } else {
                movesHtml += `<span class="text-on-surface hover:underline mr-2">${m}</span>`;
            }
        });
        
        if (line.pv.length > 5) movesHtml += '<span class="opacity-50 text-xs">...</span>';

        button.innerHTML = `
            <div class="w-14 text-center font-label-mono text-label-mono py-1 rounded shrink-0 ${badgeBg}">
                ${line.scoreText}
            </div>
            <div class="flex-1 font-label-mono text-label-mono truncate overflow-hidden text-sm">
                ${movesHtml}
            </div>
        `;
        
        button.addEventListener('click', () => {
            appState.selectedLineIndex = i;
            // Update active ring styling
            updateEngineLinesUI();
            drawBestMoveArrow();
        });
        
        DOM.engineLinesList.appendChild(button);
    }
    
    // Update Evaluation Bar (based on best line)
    if (appState.engineLines[0]) {
        const bestLine = appState.engineLines[0];
        updateEvalBar(bestLine.scoreValue, bestLine.scoreText);
    }
}

// Draw glowing visual moves on the Chessboard
function drawBestMoveArrow() {
    // Remove previous markers/arrows
    const oldArrows = DOM.boardContainer.querySelectorAll('.move-arrow-svg');
    oldArrows.forEach(a => a.remove());

    const activeLine = appState.engineLines[appState.selectedLineIndex];
    if (!activeLine || !activeLine.uci || activeLine.uci.length === 0) return;
    
    const bestMoveUci = activeLine.uci[0]; // e.g. "e2e4"
    const fromSquare = bestMoveUci.substring(0, 2);
    const toSquare = bestMoveUci.substring(2, 4);
    
    // Highlights the source and target squares on grid
    const fromDiv = DOM.boardContainer.querySelector(`[data-square="${fromSquare}"]`);
    const toDiv = DOM.boardContainer.querySelector(`[data-square="${toSquare}"]`);
    
    if (fromDiv && toDiv) {
        // Draw SVG Arrow Overlay
        const boardRect = DOM.boardContainer.getBoundingClientRect();
        const fromRect = fromDiv.getBoundingClientRect();
        const toRect = toDiv.getBoundingClientRect();
        
        const fx = (fromRect.left - boardRect.left) + fromRect.width / 2;
        const fy = (fromRect.top - boardRect.top) + fromRect.height / 2;
        const tx = (toRect.left - boardRect.left) + toRect.width / 2;
        const ty = (toRect.top - boardRect.top) + toRect.height / 2;
        
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'move-arrow-svg absolute inset-0 w-full h-full pointer-events-none z-30');
        
        // Arrow line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fx);
        line.setAttribute('y1', fy);
        line.setAttribute('x2', tx);
        line.setAttribute('y2', ty);
        
        // Best move (PV Index 0) is Gold, others are Blue/Slate
        const strokeColor = appState.selectedLineIndex === 0 ? '#f2ca50' : '#3182CE';
        
        line.setAttribute('stroke', strokeColor);
        line.setAttribute('stroke-width', '4');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0.75');
        // Glowing drop shadow shadow
        line.setAttribute('style', `filter: drop-shadow(0 0 6px ${strokeColor});`);
        
        // Triangle head (Marker)
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '6');
        marker.setAttribute('markerHeight', '6');
        marker.setAttribute('refX', '4.5');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M0,0 L0,6 L6,3 Z');
        path.setAttribute('fill', strokeColor);
        
        marker.appendChild(path);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Pull back line endpoint slightly so arrowhead doesn't clip
        const angle = Math.atan2(ty - fy, tx - fx);
        const pullBackDist = toRect.width * 0.35;
        const adjustedTx = tx - Math.cos(angle) * pullBackDist;
        const adjustedTy = ty - Math.sin(angle) * pullBackDist;
        
        line.setAttribute('x2', adjustedTx);
        line.setAttribute('y2', adjustedTy);
        line.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(line);
        DOM.boardContainer.appendChild(svg);
    }
}

// Update Advantage evaluation bar visual height & labels
function updateEvalBar(scoreVal, scoreTxt) {
    // Limit score logic to clamp height between 5% and 95%
    // A score of +5.0 or above is 95% height, -5.0 or below is 5% height
    let pct = 50;
    
    if (typeof scoreVal === 'number') {
        // Map evaluation score to percentage
        pct = 50 + (scoreVal * 9); // +5 is 95%, -5 is 5%
        pct = Math.max(5, Math.min(95, pct));
    }
    
    DOM.evalBarFill.style.height = `${pct}%`;
    DOM.evalBarText.textContent = scoreTxt;
}

// Interactive Board settings toggles
function setupBoardControls() {
    DOM.activeTurnToggle.addEventListener('change', () => {
        appState.activeTurn = DOM.activeTurnToggle.value;
        
        // Re-compile FEN string
        const parts = appState.currentFEN.split(' ');
        parts[1] = appState.activeTurn;
        appState.currentFEN = parts.join(' ');
        
        loadFEN(appState.currentFEN);
        initStockfish();
        analyzePosition();
    });

    DOM.boardOrientationToggle.addEventListener('change', () => {
        appState.boardOrientation = DOM.boardOrientationToggle.value;
        renderVirtualBoard();
    });

    // Board Edit Tool toggles
    const editModeBtn = document.getElementById('btn-edit-mode');
    const editPickerPanel = document.getElementById('piece-picker-panel');
    
    editModeBtn.addEventListener('click', () => {
        const isActive = editModeBtn.classList.contains('bg-primary');
        if (isActive) {
            editModeBtn.classList.remove('bg-primary', 'text-on-primary');
            editModeBtn.classList.add('bg-surface-container-high', 'text-on-surface');
            editPickerPanel.classList.add('hidden');
        } else {
            editModeBtn.classList.add('bg-primary', 'text-on-primary');
            editModeBtn.classList.remove('bg-surface-container-high', 'text-on-surface');
            editPickerPanel.classList.remove('hidden');
        }
        renderVirtualBoard();
    });
    
    // Picker items
    document.querySelectorAll('.piece-picker-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.piece-picker-btn').forEach(b => b.classList.remove('active', 'ring-2', 'ring-primary'));
            btn.classList.add('active', 'ring-2', 'ring-primary');
        });
    });

    // Copy PGN & FEN handlers
    DOM.btnCopyPGN.addEventListener('click', () => {
        const pgn = chess.pgn();
        navigator.clipboard.writeText(pgn || '[Event "Casual Play"]\n[Result "*"]\n\n*')
            .then(() => showToast('PGN copied to clipboard!'))
            .catch(() => showToast('Failed to copy PGN.'));
    });

    DOM.btnExportFEN.addEventListener('click', () => {
        navigator.clipboard.writeText(chess.fen())
            .then(() => showToast('FEN copied to clipboard!'))
            .catch(() => showToast('Failed to copy FEN.'));
    });

    // Add Save to History Button
    const btnSaveAnalysis = document.getElementById('btn-save-analysis');
    if (btnSaveAnalysis) {
        btnSaveAnalysis.addEventListener('click', savePositionToHistory);
    }
}

// -------------------------------------------------------------
// History Management & Storage
// -------------------------------------------------------------

function savePositionToHistory() {
    // Detect opening if exists
    let title = 'Custom Position';
    if (chess.history().length === 0) {
        title = 'Casual Analysis';
    } else {
        title = `Analysis Line`;
    }
    
    const evaluation = appState.engineLines[0] ? appState.engineLines[0].scoreText : '0.00';
    const depthStr = appState.currentAnalysisDepth || appState.depth;
    
    const record = {
        id: Date.now(),
        title: title,
        description: `FEN: ${chess.fen().substring(0, 30)}...`,
        fen: chess.fen(),
        evalText: evaluation,
        depth: depthStr,
        timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        screenshot: appState.uploadedImage // Save cropped canvas thumbnails if needed
    };
    
    appState.history.unshift(record);
    localStorage.setItem('gm_analysis_history', JSON.stringify(appState.history));
    
    showToast('Saved to Analysis History!');
}

function renderHistory() {
    DOM.historyGrid.innerHTML = '';
    
    if (appState.history.length === 0) {
        DOM.historyGrid.innerHTML = `
            <div class="col-span-full py-16 flex flex-col items-center justify-center text-center opacity-60">
                <span class="material-symbols-outlined text-[64px] mb-4">history</span>
                <p class="font-body-lg text-body-lg text-on-surface">No saved analyses yet</p>
                <p class="font-body-sm text-body-sm text-on-surface-variant max-w-[300px] mt-2">
                    Analyze a position from a screenshot and save it to review it here.
                </p>
            </div>
        `;
        return;
    }
    
    appState.history.forEach(record => {
        const card = document.createElement('div');
        card.className = 'bg-surface-container-low border border-surface-gray rounded-lg overflow-hidden hover:border-primary/50 hover:bg-surface-container transition-all duration-200 cursor-pointer group flex flex-col h-full relative';
        
        // Status indicator line color matches positive/negative advantage
        const isWhiteAdvantage = record.evalText.startsWith('+') || record.evalText.startsWith('M');
        const isNeutral = record.evalText === '0.00' || record.evalText === '0.0';
        const indicatorColor = isNeutral ? 'bg-surface-gray' : isWhiteAdvantage ? 'bg-primary' : 'bg-loss-red';

        card.innerHTML = `
            <div class="absolute left-0 top-0 bottom-0 w-1 ${indicatorColor} group-hover:opacity-100 opacity-60 transition-opacity"></div>
            
            <div class="aspect-square bg-deep-charcoal border-b border-surface-gray relative overflow-hidden flex items-center justify-center">
                ${record.screenshot 
                    ? `<img src="${record.screenshot}" class="w-full h-full object-cover opacity-75 group-hover:opacity-90 transition-opacity mix-blend-luminosity group-hover:mix-blend-normal">`
                    : `<span class="material-symbols-outlined text-4xl opacity-35">grid_view</span>`
                }
                <!-- Eval label on thumbnail -->
                <div class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-label-mono ${isWhiteAdvantage ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-loss-red/20 text-loss-red border border-loss-red/30'}">
                    ${record.evalText}
                </div>
            </div>
            
            <div class="p-4 flex-1 flex flex-col pl-6">
                <div class="flex justify-between items-start mb-1">
                    <h3 class="font-headline-md text-headline-md text-on-surface truncate pr-2 group-hover:text-primary transition-colors text-[18px]">
                        ${record.title}
                    </h3>
                    <button class="text-on-surface-variant hover:text-loss-red delete-history-btn shrink-0" data-id="${record.id}">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
                <p class="font-body-sm text-body-sm text-on-surface-variant truncate mb-3 text-[12px]">${record.description}</p>
                <div class="flex items-center gap-2 mt-auto pt-2 border-t border-surface-gray/50">
                    <div class="px-2 py-0.5 bg-surface-container border border-surface-gray rounded text-label-mono font-label-mono text-[10px] text-on-surface-variant">
                        Depth ${record.depth}
                    </div>
                    <span class="font-body-sm text-body-sm text-on-surface-variant ml-auto text-[10px]">${record.timestamp}</span>
                </div>
            </div>
        `;
        
        // Select entry to load
        card.addEventListener('click', (e) => {
            // If click was on delete button, do not load
            if (e.target.closest('.delete-history-btn')) return;
            
            loadFEN(record.fen);
            appState.uploadedImage = record.screenshot;
            
            // Switch screen to analysis
            appState.activeScreen = 'analysis';
            setupNavigation();
            navigateToScreen('analysis');
            
            initStockfish();
            analyzePosition();
            showToast(`Loaded "${record.title}" from history.`);
        });
        
        // Delete button handler
        card.querySelector('.delete-history-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(e.currentTarget.dataset.id);
            appState.history = appState.history.filter(h => h.id !== id);
            localStorage.setItem('gm_analysis_history', JSON.stringify(appState.history));
            renderHistory();
            showToast('Analysis removed from history.');
        });
        
        DOM.historyGrid.appendChild(card);
    });
}

// Game flipped detector (blunders)
let previousEval = null;
function checkForBlunderFlip(move) {
    if (!appState.engineLines[0]) return;
    
    const currentEval = appState.engineLines[0].scoreValue;
    if (previousEval !== null) {
        const delta = currentEval - previousEval;
        // If turn was White, a drop in eval represents a mistake/blunder by White.
        // If turn was Black, an increase in eval represents a mistake/blunder by Black.
        const playerWhoMoved = move.color; // 'w' or 'b'
        const blunderThreshold = 1.8; // Centipawn drop indicating serious mistake
        
        let isBlunder = false;
        if (playerWhoMoved === 'w' && delta < -blunderThreshold) {
            isBlunder = true;
        } else if (playerWhoMoved === 'b' && delta > blunderThreshold) {
            isBlunder = true;
        }
        
        if (isBlunder) {
            showToast(`⚠️ Position shift! That move flipped the advantage by ${Math.abs(delta).toFixed(1)} points.`);
            // Highlight evaluation bar or make blunder warning banner visible
            showBlunderBanner(Math.abs(delta));
        } else {
            hideBlunderBanner();
        }
    }
    previousEval = currentEval;
}

// -------------------------------------------------------------
// UI Utilities / Overlays
// -------------------------------------------------------------

function navigateToScreen(screenId) {
    appState.activeScreen = screenId;
    Object.keys(DOM.screens).forEach(key => {
        if (key === screenId) {
            DOM.screens[key].classList.remove('hidden');
        } else {
            DOM.screens[key].classList.add('hidden');
        }
    });
}

function showLoadingOverlay(msg) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-background/85 z-[100] flex flex-col items-center justify-center gap-4';
        overlay.innerHTML = `
            <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <div id="loading-overlay-text" class="font-headline-md text-headline-md text-primary font-semibold tracking-wide">Loading...</div>
        `;
        document.body.appendChild(overlay);
    }
    document.getElementById('loading-overlay-text').textContent = msg;
    overlay.classList.remove('hidden');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

function showToast(msg) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-[90%] max-w-sm';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'bg-surface-container border border-surface-bright text-on-surface px-4 py-3 rounded-lg shadow-lg font-body-sm text-body-sm text-center flex items-center justify-center gap-2 animate-bounce-short';
    toast.innerHTML = `<span class="material-symbols-outlined text-primary text-[18px]">info</span> ${msg}`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showBlunderBanner(points) {
    let banner = document.getElementById('blunder-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'blunder-banner';
        banner.className = 'w-full max-w-[800px] mt-3 bg-[#3A1C1C] border border-loss-red text-loss-red p-3 rounded-lg flex items-center gap-3 animate-pulse';
        DOM.boardContainer.parentElement.insertBefore(banner, DOM.boardContainer.nextSibling);
    }
    banner.innerHTML = `
        <span class="material-symbols-outlined text-loss-red">warning</span>
        <div>
            <div class="font-bold text-sm">Blunder detected!</div>
            <div class="text-xs opacity-85">The advantage shifted by ${points.toFixed(1)} points. Review the top candidate moves to find the win.</div>
        </div>
    `;
    banner.classList.remove('hidden');
}

function hideBlunderBanner() {
    const banner = document.getElementById('blunder-banner');
    if (banner) banner.classList.add('hidden');
}
