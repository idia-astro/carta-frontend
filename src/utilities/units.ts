export function velocityFromFrequency(freq: number, refFreq: number): number {
    const c = 299792458;
    return c * (1.0 - freq / refFreq);
}

export function velocityStringFromFrequency(freq: number, refFreq: number): string {
    if (isFinite(refFreq)) {
        const velocityVal = velocityFromFrequency(freq, refFreq);
        return `Velocity:\u00a0${(velocityVal * 1e-3).toFixed(4)}\u00a0km/s`;
    }
    return null;
}

export function frequencyFromVelocity(velocity: number, refFreq: number): number {
    const c = 299792458;
    return refFreq * (1.0 - velocity / c);
}

export function frequencyStringFromVelocity(velocity: number, refFreq: number): string {
    if (isFinite(refFreq)) {
        const frequencyVal = frequencyFromVelocity(velocity, refFreq);
        return `Frequency:\u00a0${(frequencyVal * 1e-9).toFixed(4)}\u00a0GHz`;
    }
    return null;
}

// According to MDN, toFixed only works for up to 20 decimals
export function toFixed(val: number, decimals: number) {
    if (isFinite(val) && isFinite(decimals) && decimals >= 0 && decimals <= 20) {
      return val.toFixed(decimals);
    }
    // leave undefined or non-finite values as is (+- INF, NaN and undefined will still appear properly)
    return val;
}

export function formattedNotation(value: number): string {
    if (value === null || isNaN(value)) {
        return null;
    }
    return value < 1e-2 ? value.toExponential(2) : value.toFixed(2);
}

export function formattedExponential(val: number, digits: number, unit: string = "", trim: boolean = true, pad: boolean = false) {
    let valString = val.toExponential(digits);
    if (trim) {
        // remove unnecessary trailing decimals
        valString = valString.replace(/0+e/, "e");
        valString = valString.replace(".e", ".0e");
        // strip unnecessary exponential notation
        valString = valString.replace("e+0", "");
    }
    if (pad && val >= 0) {
        valString = " " + valString;
    }
    // append unit
    if (unit && unit.length) {
        valString = `${valString} ${unit}`;
    }
    return valString;
}