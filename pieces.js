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

// Full name mapping
const PIECE_NAMES = {
    'P': 'Pawn',
    'R': 'Rook',
    'N': 'Knight',
    'B': 'Bishop',
    'Q': 'Queen',
    'K': 'King'
};

/**
 * Heuristic Classifier for Chess Pieces.
 * Classifies a cropped piece canvas using geometric and density descriptors.
 */
function classifyPieceHeuristic(canvas, isWhiteSquare) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Determine Background Color by sampling corners
    const corners = [
        getPixel(data, 0, 0, w),
        getPixel(data, w - 1, 0, w),
        getPixel(data, 0, h - 1, w),
        getPixel(data, w - 1, h - 1, w),
        getPixel(data, 2, 2, w),
        getPixel(data, w - 3, 2, w)
    ];
    
    // Average corner color represents the square background
    let bgR = 0, bgG = 0, bgB = 0;
    corners.forEach(c => {
        bgR += c.r;
        bgG += c.g;
        bgB += c.b;
    });
    bgR = Math.round(bgR / corners.length);
    bgG = Math.round(bgG / corners.length);
    bgB = Math.round(bgB / corners.length);

    // 2. Extract Foreground Pixels (Distance from background)
    let minX = w, maxX = 0, minY = h, maxY = 0;
    const fgMask = [];
    let fgCount = 0;

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const pixel = getPixel(data, x, y, w);
            const dist = colorDistance(pixel, { r: bgR, g: bgG, b: bgB });
            
            // Threshold for foreground detection
            // We ignore board coordinates text (often in the bottom-left or top-right corners of edge squares)
            // by skipping border pixels
            const isBorder = (x < w * 0.08 || x > w * 0.92 || y < h * 0.08 || y > h * 0.92);
            
            if (dist > 38 && !isBorder) {
                fgMask.push({ x, y, r: pixel.r, g: pixel.g, b: pixel.b, brightness: (pixel.r + pixel.g + pixel.b) / 3 });
                fgCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    // If there are too few foreground pixels, the square is empty
    const areaRatio = fgCount / (w * h);
    if (areaRatio < 0.035) {
        return null;
    }

    // 3. Determine Color (White or Black)
    // White pieces are filled with white, black pieces are filled with dark gray/black.
    // Calculate average brightness of the foreground pixels
    let totalBrightness = 0;
    fgMask.forEach(p => totalBrightness += p.brightness);
    const avgBrightness = totalBrightness / fgCount;
    const color = avgBrightness > 120 ? 'w' : 'b';

    // 4. Classify Type (P, N, B, R, Q, K) based on bounding box features
    const pW = (maxX - minX) + 1;
    const pH = (maxY - minY) + 1;
    const pArea = fgCount;
    
    // Feature metrics
    const aspectRatio = pH / pW;
    const density = pArea / (pW * pH);

    // Profile counters
    let topThird = 0;
    let midThird = 0;
    let bottomThird = 0;
    let leftHalf = 0;
    let rightHalf = 0;

    fgMask.forEach(p => {
        // Relative coordinates inside bounding box
        const relY = (p.y - minY) / pH;
        const relX = (p.x - minX) / pW;

        if (relY < 0.3) topThird++;
        else if (relY < 0.7) midThird++;
        else bottomThird++;

        if (relX < 0.5) leftHalf++;
        else rightHalf++;
    });

    const topToBottom = topThird / (bottomThird || 1);
    const midToTotal = midThird / pArea;
    const symmetry = leftHalf / (rightHalf || 1);

    let type = 'P'; // Default to Pawn

    // Knight: Horse shape is highly asymmetric (facing left in standard styles)
    if (symmetry > 1.28 || symmetry < 0.78) {
        type = 'N';
    } 
    // Rook: Very boxy and dense, balanced top and bottom
    else if (density > 0.62 && aspectRatio < 1.15 && topToBottom > 0.65) {
        type = 'R';
    } 
    // Pawn: Small piece, very bottom-heavy
    else if (areaRatio < 0.075 && topToBottom < 0.45) {
        type = 'P';
    } 
    // King: Very tall, narrow top (cross) and wide bottom
    else if (aspectRatio > 1.25 && topToBottom < 0.6) {
        type = 'K';
    }
    // Queen: Tall, spiked wide crown (very active middle and top area)
    else if (aspectRatio > 1.1 && topToBottom > 0.65 && density > 0.48) {
        type = 'Q';
    } 
    // Bishop: Oval-shaped, narrow top and bottom, wide middle
    else {
        type = 'B';
    }

    return color + type;
}

// Helpers
function getPixel(data, x, y, width) {
    const idx = (y * width + x) * 4;
    return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3]
    };
}

function colorDistance(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}
