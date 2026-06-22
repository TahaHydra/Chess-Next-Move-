// Chess Piece Assets and Recognition Configuration
const PIECE_IMAGES = {
    'wP': 'https://chessboardjs.com/img/chesspieces/wikipedia/wP.png',
    'wR': 'https://chessboardjs.com/img/chesspieces/wikipedia/wR.png',
    'wN': 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png',
    'wB': 'https://chessboardjs.com/img/chesspieces/wikipedia/wB.png',
    'wQ': 'https://chessboardjs.com/img/chesspieces/wikipedia/wQ.png',
    'wK': 'https://chessboardjs.com/img/chesspieces/wikipedia/wK.png',
    'bP': 'https://chessboardjs.com/img/chesspieces/wikipedia/bP.png',
    'bR': 'https://chessboardjs.com/img/chesspieces/wikipedia/bR.png',
    'bN': 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png',
    'bB': 'https://chessboardjs.com/img/chesspieces/wikipedia/bB.png',
    'bQ': 'https://chessboardjs.com/img/chesspieces/wikipedia/bQ.png',
    'bK': 'https://chessboardjs.com/img/chesspieces/wikipedia/bK.png'
};

const PIECE_CODES = ['wP', 'wR', 'wN', 'wB', 'wQ', 'wK', 'bP', 'bR', 'bN', 'bB', 'bQ', 'bK'];
const pieceTemplates = []; // Holds preloaded templates: { code, img, theme }

// Preload templates for template matching
function preloadPieceTemplates() {
    // 1. Preload Lichess cburnett/wikipedia style pieces (hosted on CDNJS with CORS)
    PIECE_CODES.forEach(code => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/${code}.png`;
        img.onload = () => {
            pieceTemplates.push({ code, img, theme: 'cburnett' });
        };
        img.onerror = () => {
            // Backup loading path if CDNJS fails
            const backupImg = new Image();
            backupImg.crossOrigin = 'anonymous';
            backupImg.src = `https://unpkg.com/chessboardjs@1.0.0/www/img/chesspieces/wikipedia/${code}.png`;
            backupImg.onload = () => {
                pieceTemplates.push({ code, img: backupImg, theme: 'cburnett' });
            };
        };
    });

    // 2. Preload Chess.com Neo style pieces (try to load, fail gracefully if CORS issues)
    PIECE_CODES.forEach(code => {
        const charColor = code.charAt(0); // 'w' or 'b'
        const charType = code.charAt(1).toLowerCase(); // 'p', 'r', 'n', 'b', 'q', 'k'
        const chessComCode = charColor + charType;
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = `https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${chessComCode}.png`;
        img.onload = () => {
            pieceTemplates.push({ code, img, theme: 'neo' });
        };
        // If Chess.com CORS fails, we simply ignore it (Wikipedia templates are good enough)
        img.onerror = () => {
            console.log(`Failed to preload Chess.com Neo template for ${code} due to CORS or network.`);
        };
    });
}

// Start preloading immediately
preloadPieceTemplates();

/**
 * Helper to get a pixel's RGB values from canvas image data.
 */
function getPixel(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
    };
}

/**
 * Heuristic color distance helper.
 */
function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

/**
 * Programmatic Template Matching Classifier for Chess Pieces.
 * Compares the inner 70% of a cropped square against the preloaded template piece masks
 * and returns the closest piece code or null if empty.
 */
function classifyPieceHeuristic(canvas, isLightSquare, colorLight, colorDark) {
    const S = canvas.width;
    const ctx = canvas.getContext('2d');
    const cellData = ctx.getImageData(0, 0, S, S).data;
    
    const bg = isLightSquare ? colorLight : colorDark;
    
    // We compare the middle 70% of the square to ignore coordinates text and grid line boundaries
    const startX = Math.round(S * 0.15);
    const endX = Math.round(S * 0.85);
    const startY = Math.round(S * 0.15);
    const endY = Math.round(S * 0.85);
    const totalPixels = (endX - startX) * (endY - startY);
    
    // 1. Calculate error against an empty square (pure background color)
    let emptyError = 0;
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const idx = (y * S + x) * 4;
            emptyError += Math.abs(cellData[idx] - bg.r) +
                          Math.abs(cellData[idx + 1] - bg.g) +
                          Math.abs(cellData[idx + 2] - bg.b);
        }
    }
    emptyError = emptyError / totalPixels;
    
    // If the average color difference is very low, the square is definitely empty
    // (Normal empty squares have error < 3, while squares with pieces have error > 25)
    if (emptyError < 12.0) {
        return null;
    }
    
    // 2. Perform Template Matching against preloaded pieces
    let bestPieceCode = null;
    let minPieceError = Infinity;
    
    // Create an offscreen canvas to render templates
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = S;
    tempCanvas.height = S;
    const tempCtx = tempCanvas.getContext('2d');
    
    pieceTemplates.forEach(template => {
        // Draw the template piece on the exact background color of this square
        const img = template.img;
        if (!img || !img.complete || img.naturalWidth === 0) return; // Image not fully loaded yet
        
        tempCtx.fillStyle = `rgb(${bg.r}, ${bg.g}, ${bg.b})`;
        tempCtx.fillRect(0, 0, S, S);
        tempCtx.drawImage(img, 0, 0, S, S);
        
        const templateData = tempCtx.getImageData(0, 0, S, S).data;
        
        // Compute pixel absolute error
        let error = 0;
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const idx = (y * S + x) * 4;
                error += Math.abs(cellData[idx] - templateData[idx]) +
                         Math.abs(cellData[idx + 1] - templateData[idx + 1]) +
                         Math.abs(cellData[idx + 2] - templateData[idx + 2]);
            }
        }
        error = error / totalPixels;
        
        if (error < minPieceError) {
            minPieceError = error;
            bestPieceCode = template.code;
        }
    });
    
    // Compare the best piece template error with the empty square error
    if (emptyError < minPieceError) {
        return null;
    }
    
    return bestPieceCode;
}
