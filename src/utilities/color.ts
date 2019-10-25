// Static assets
import allMaps from "static/allmaps.png";
import {RenderConfigStore} from "stores";

export interface RGBA {
    r: number;
    g: number;
    b: number;
    a: number;
}

export function isColorValid(colorString: string): boolean {
    const colorHex: RegExp = /^#([A-Fa-f0-9]{3}){1,2}$/;
    return colorHex.test(colorString);
}

// adapted from https://stackoverflow.com/questions/21646738/convert-hex-to-rgba
export function hexStringToRgba(colorString: string, alpha: number = 1): RGBA {
    if (!isColorValid(colorString)) {
        return null;
    }

    let c = colorString.substring(1).split("");
    if (c.length === 3) { // shorthand hex color
        c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    const hex = Number("0x" + c.join(""));

    return {
        r: (hex >> 16) & 255,
        g: (hex >> 8) & 255,
        b: hex & 255,
        a: alpha
    };
}
// end stolen from https://stackoverflow.com/questions/21646738/convert-hex-to-rgba

// return color map as Uint8ClampedArray according colorMap
function initContextWithSize(size: number) {
    const canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.width = size; 
    canvas.height = size; 
    const ctx = canvas.getContext("2d");
    return ctx;
}

export function getColorsForValues (colorMap: string): {color: Uint8ClampedArray, size: number} {
    const colorMaps = RenderConfigStore.COLOR_MAPS_ALL;
    const colorMapsSize = colorMaps.length;
    const colorMapIndex = colorMaps.indexOf(colorMap);
    const percentage = colorMapIndex / colorMapsSize; 

    const canvasSize = colorMapsSize * 20;
    const ctx = initContextWithSize(canvasSize);

    if (!allMaps) {
        return null;
    }
    const imageObj = new Image();
    imageObj.src = allMaps;
    ctx.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height);
    const colorMapPixel = ctx.getImageData(0, percentage * imageObj.height, (imageObj.width - 1), 1);
    return {color: colorMapPixel.data, size: colorMapPixel.width}; 
}
