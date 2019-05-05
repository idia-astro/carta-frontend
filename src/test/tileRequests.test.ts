import {FrameView, Point2D} from "../models";

export interface TileCoordinate {
    layer: number;
    x: number;
    y: number;
}

// Some default tile/image sizes
const Tile256: Point2D = {x: 256, y: 256};
const Tile512: Point2D = {x: 512, y: 512};
const Tile1024: Point2D = {x: 1024, y: 1024};
const Tile2048: Point2D = {x: 2048, y: 2048};
const WideTile: Point2D = {x: 1024, y: 512};
const TallTile: Point2D = {x: 512, y: 1024};

export const DefaultFrameView: FrameView = {xMin: 0, xMax: 512, yMin: 0, yMax: 512, mip: 1};

const tileSort = (a: TileCoordinate, b: TileCoordinate) => {
    if (a.layer !== b.layer) {
        return a.layer - b.layer;
    } else if (a.x !== b.x) {
        return a.x - b.x;
    } else {
        return a.y - b.y;
    }
};

function GetRequiredTiles(frameView: FrameView, imageSize: Point2D, tileSize: Point2D): TileCoordinate[] {
    // Validate FrameView object
    if (!frameView || !isFinite(frameView.xMin) || !isFinite(frameView.xMax) || !isFinite(frameView.yMin) || !isFinite(frameView.yMax) || !isFinite(frameView.mip)) {
        return [];
    }

    // Validate FrameView contents
    if (frameView.xMin >= frameView.xMax || frameView.yMin >= frameView.yMax || frameView.mip <= 0) {
        return [];
    }

    // Validate image and tile size objects
    if (!imageSize || !tileSize || !isFinite(imageSize.x) || !isFinite(imageSize.y) || !isFinite(tileSize.x) || !isFinite(tileSize.y)) {
        return [];
    }

    // Validate image and tile sizes
    if (tileSize.x <= 0 || tileSize.y <= 0 || imageSize.x <= 0 || imageSize.y <= 0) {
        return [];
    }

    // Check if view is out of image range
    if (frameView.xMax < 0 || frameView.xMin > imageSize.x || frameView.yMax < 0 || frameView.yMin > imageSize.y) {
        return [];
    }

    const boundedFrameView: FrameView = {
        xMin: Math.max(0, frameView.xMin),
        xMax: Math.min(frameView.xMax, imageSize.x),
        yMin: Math.max(0, frameView.yMin),
        yMax: Math.min(frameView.yMax, imageSize.y),
        mip: frameView.mip
    };

    const adjustedTileSize: Point2D = {
        x: frameView.mip * tileSize.x,
        y: frameView.mip * tileSize.y,
    };

    const xStart = Math.floor(boundedFrameView.xMin / adjustedTileSize.x);
    const xEnd = Math.ceil(boundedFrameView.xMax / adjustedTileSize.x);
    const yStart = Math.floor(boundedFrameView.yMin / adjustedTileSize.y);
    const yEnd = Math.ceil(boundedFrameView.yMax / adjustedTileSize.y);

    const totalTilesX = Math.ceil(imageSize.x / tileSize.x);
    const totalTilesY = Math.ceil(imageSize.y / tileSize.y);
    const maxMip = Math.max(totalTilesX, totalTilesY);
    const totalLayers = Math.ceil(Math.log2(maxMip));
    const layer = totalLayers - Math.ceil(Math.log2(frameView.mip));

    const numTilesX = xEnd - xStart;
    const numTilesY = yEnd - yStart;
    const tileSet: TileCoordinate[] = new Array<TileCoordinate>(numTilesX * numTilesY);
    for (let x = xStart, i = 0; x < xEnd; x++) {
        for (let y = yStart; y < yEnd; y++, i++) {
            tileSet[i] = {x, y, layer};
        }
    }

    const midPoint = {x: (xStart + xEnd) / 2.0, y: (yStart + yEnd) / 2.0};
    // return tileSet.sort((a, b) => {
    //     const aX = midPoint.x - a.x;
    //     const aY = midPoint.y - a.y;
    //     const bX = midPoint.x - b.x;
    //     const bY = midPoint.y - b.y;
    //     return (aX * aX + aY * aY) - (bX * bX + bY * bY);
    // });

    return tileSet;
}

test("returns an empty array if FrameView is invalid", () => {
    expect(GetRequiredTiles(null, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles(undefined, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles("test_string", Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles(1, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({yMin: 0, xMax: 1024, yMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, xMax: 1024, yMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 0, yMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 0, xMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 0, xMax: 1024, yMax: 1024}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 0, xMax: 1024, yMax: 1024, mip: "bob"}, Tile256, Tile1024)).toEqual([]);

});

test("returns an empty array if FrameView bounds are inconsistent", () => {
    expect(GetRequiredTiles({xMin: 512, yMin: 0, xMax: 512, yMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 513, yMin: 0, xMax: 512, yMax: 1024, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 513, xMax: 1024, yMax: 512, mip: 1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 512, xMax: 1024, yMax: 512, mip: 1}, Tile256, Tile1024)).toEqual([]);
});

test("returns an empty array if FrameView mip is out of bounds", () => {
    expect(GetRequiredTiles({xMin: 0, yMin: 0, xMax: 1024, yMax: 1024, mip: -1}, Tile256, Tile1024)).toEqual([]);
    expect(GetRequiredTiles({xMin: 0, yMin: 0, xMax: 1024, yMax: 1024, mip: 0}, Tile256, Tile1024)).toEqual([]);
});

test("returns an empty array if image size is invalid", () => {
    expect(GetRequiredTiles(DefaultFrameView, null, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, undefined, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, 1, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, [1, 1], Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, "bob", Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {w: 10, h: 10}, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {x: 10}, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {y: 10}, Tile256)).toEqual([]);
});

test("returns an empty array if image size is out of bounds", () => {
    expect(GetRequiredTiles(DefaultFrameView, {x: Tile1024.x, y: -1}, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {x: Tile1024.x, y: 0}, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {x: -1, y: Tile1024.y}, Tile256)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, {x: 0, y: Tile1024.y}, Tile256)).toEqual([]);
});

test("returns an empty array if frame view is outside of the image", () => {
    expect(GetRequiredTiles({xMin: -100, xMax: -50, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
    expect(GetRequiredTiles({xMin: WideTile.x + 50, xMax: WideTile.x + 100, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
    expect(GetRequiredTiles({xMin: WideTile.x + 50, xMax: WideTile.x + 100, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
    expect(GetRequiredTiles({xMin: WideTile.x + 50, xMax: WideTile.x + 100, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
    expect(GetRequiredTiles({xMin: -100, xMax: -50, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
    expect(GetRequiredTiles({xMin: -100, xMax: -50, yMin: 0, yMax: 256, mip: 1}, WideTile, Tile256)).toEqual([]);
});

test("returns an empty array if tile size is invalid", () => {
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, null)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, undefined)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, 1)).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, [1, 1])).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, "bob")).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {w: 10, h: 10})).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {x: 10})).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {y: 10})).toEqual([]);
});

test("returns an empty array if tile size is out of bounds", () => {
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {x: Tile256.x, y: -1})).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {x: Tile256.x, y: 0})).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {x: -1, y: Tile256.y})).toEqual([]);
    expect(GetRequiredTiles(DefaultFrameView, Tile1024, {x: 0, y: Tile256.y})).toEqual([]);
});

test("returns a single tile if tile size is equal to image size", () => {
    const result = GetRequiredTiles(DefaultFrameView, Tile256, Tile256);
    expect(result).toEqual([{x: 0, y: 0, layer: 0}]);
});

test("returns a single tile if tile size is larger than image size", () => {
    const result = GetRequiredTiles(DefaultFrameView, Tile256, Tile1024);
    expect(result).toEqual([{x: 0, y: 0, layer: 0}]);
});

test("returns the correct list of tiles when viewing a 1024x1024 image at full resolution using 512x512 tiles", () => {
    // Full resolution 1024x1024 image using 512x512 tiles
    const result = GetRequiredTiles({xMin: 0, xMax: 1024, yMin: 0, yMax: 1024, mip: 1}, Tile1024, Tile512);
    // Full resolution: 2x2 tiles => layer = 1. Tile coordinates start at one
    const expected: TileCoordinate[] = [];
    [0, 1].forEach(x => {
        [0, 1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
    // TODO: introduce checks to ensure optimal tile ordering
});

test("returns the correct list of tiles when viewing a 1024x1024 image at full resolution using 256x256 tiles", () => {
    // Full resolution 1024x1024 image using 512x512 tiles
    const result = GetRequiredTiles({xMin: 0, xMax: 1024, yMin: 0, yMax: 1024, mip: 1}, Tile1024, Tile256);
    // Full resolution: 4x4 tiles => layer = 2. Tile coordinates start at one
    const expected: TileCoordinate[] = [];
    [0, 1, 2, 3].forEach(x => {
        [0, 1, 2, 3].forEach(y => {
            expected.push({x, y, layer: 2});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(16);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a tall section of a 1024x1024 image at full resolution using 256x256 tiles", () => {
    const result = GetRequiredTiles({xMin: 100, xMax: 300, yMin: 100, yMax: 600, mip: 1}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0, 1].forEach(x => {
        [0, 1, 2].forEach(y => {
            expected.push({x, y, layer: 2});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(6);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a wide section of a 1024x1024 image at full resolution using 256x256 tiles", () => {
    const result = GetRequiredTiles({xMin: -100, xMax: 1000, yMin: 800, yMax: 900, mip: 1}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0, 1, 2, 3].forEach(x => {
        [3].forEach(y => {
            expected.push({x, y, layer: 2});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a tall section of a 1024x1024 image at half resolution using 256x256 tiles", () => {
    const result = GetRequiredTiles({xMin: 100, xMax: 300, yMin: 100, yMax: 600, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0].forEach(x => {
        [0, 1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a wide section of a 1024x1024 image at half resolution using 256x256 tiles", () => {
    const result = GetRequiredTiles({xMin: -100, xMax: 1000, yMin: 800, yMax: 900, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0, 1].forEach(x => {
        [1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a wide section partially above image", () => {
    const result = GetRequiredTiles({xMin: 100, xMax: 1000, yMin: 900, yMax: 1100, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0, 1].forEach(x => {
        [1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a wide section partially below image", () => {
    const result = GetRequiredTiles({xMin: 100, xMax: 1000, yMin: -100, yMax: 100, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0, 1].forEach(x => {
        [0].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a tall section partially left of image", () => {
    const result = GetRequiredTiles({xMin: -100, xMax: 50, yMin: 100, yMax: 1000, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [0].forEach(x => {
        [0, 1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("returns the correct list of tiles when viewing a tall section partially right of image", () => {
    const result = GetRequiredTiles({xMin: 900, xMax: 1100, yMin: 100, yMax: 1000, mip: 2}, Tile1024, Tile256);
    const expected: TileCoordinate[] = [];
    [1].forEach(x => {
        [0, 1].forEach(y => {
            expected.push({x, y, layer: 1});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("give correct result when viewing a 16K image at full resolution using 256x256 tiles", () => {
    const result = GetRequiredTiles({xMin: 0, xMax: 16384, yMin: 0, yMax: 16384, mip: 1}, {x: 16384, y: 16384}, Tile256);

    let xRange = Array.from({length: 64}, ((v, k) => k));
    let yRange = Array.from({length: 64}, ((v, k) => k));

    const expected: TileCoordinate[] = [];
    xRange.forEach(x => {
        yRange.forEach(y => {
            expected.push({x, y, layer: 6});
        });
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(64 * 64);
    expect(result.sort(tileSort)).toEqual(expected.sort(tileSort));
});

test("take less than 2 ms when viewing a 16K image at full resolution using 256x256 tiles", () => {
    const tStart = performance.now();
    const result = GetRequiredTiles({xMin: 0, xMax: 16384, yMin: 0, yMax: 16384, mip: 1}, {x: 16384, y: 16384}, Tile256);
    const tEnd = performance.now();

    const runTime = tEnd - tStart;

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(64 * 64);
    expect(runTime).toBeLessThan(2);
});