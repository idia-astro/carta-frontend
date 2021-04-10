#version 300 es
precision highp float;

#define BOX_FILLED 0
#define BOX_LINED 1
#define CIRCLE_FILLED 2
#define CIRCLE_LINED 3
#define HEXAGON_FILLED 4
#define HEXAGON_LINED 5
#define RHOMB_FILLED 6
#define RHOMB_LINED 7
#define TRIANGLE_FILLED_UP 8
#define TRIANGLE_LINED_UP 9
#define ELLIPSE_FILLED 10
#define ELLIPSE_LINED 11
#define TRIANGLE_FILLED_DOWN 12
#define TRIANGLE_LINED_DOWN 13
#define HEXAGON_FILLED_2 14
#define HEXAGON_LINED_2 15
#define CROSS_FILLED 16
#define CROSS_LINED 17
#define X_FILLED 18
#define X_LINED 19

#define SIN_0 0.0
#define COS_0 1.0
#define COS_45 0.70710678118
#define SIN_60 0.86602540378
#define COS_60 0.5
#define SIN_90 1.0
#define COS_90 0.0

#define FLT_MAX 3.402823466e+38

uniform float uLineThickness;
uniform highp int uShapeType;
uniform float uFeatherWidth;
uniform vec3 uPointColor;
uniform vec3 uSelectedSourceColor;
// color map
uniform bool uCmapEnabled;
uniform sampler2D uCmapTexture;
uniform int uNumCmaps;
uniform int uCmapIndex;
uniform bool uOmapEnabled;

in float v_colour;
in float v_pointSize;
in float v_orientation;
in float v_selected;
out vec4 outColor;

mat2 rot45 = mat2(COS_45, -COS_45, COS_45, COS_45);
mat2 rot60 = mat2(COS_60, -SIN_60, SIN_60, COS_60);
mat2 rot90 = mat2(COS_90, -SIN_90, SIN_90, COS_90);
mat2 rot120 = mat2(-COS_60, -SIN_60, SIN_60, -COS_60);
mat2 rot180 = mat2(-COS_0, SIN_0, -SIN_0, -COS_0);

mat2 rotateMat(float deg) {
    float rads = radians(deg);
    float cosRads = cos(rads);
    float sinRads = sin(rads);
    return mat2(cosRads, -sinRads, sinRads, cosRads);
}

// Circle
float featherRange(vec2 a, float rMax) {
    float r = length(a);
    float v = (rMax - r - uFeatherWidth) / (2.0 * uFeatherWidth);
    return smoothstep(0.0, 1.0, v);
}

float featherRange(vec2 a, float rMin, float rMax) {
    float r = length(a);
    vec2 v = (vec2(rMax, rMin) - r - uFeatherWidth) / (2.0 * uFeatherWidth);
    vec2 alpha = smoothstep(0.0, 1.0, v);
    // subtract inner feathered circle
    return (alpha.x) * (1.0 - alpha.y);
}

// Ellipse
float featherRangeEllipse(vec2 r, float rMax) {
    float v =  ((pow(rMax, 2.0) - pow(r.x, 2.0) * 3.0) - uFeatherWidth - pow(r.y, 2.0)) / (2.0 * uFeatherWidth);
    return smoothstep(0.0, 1.0, v);
}

float featherRangeEllipse(vec2 r, float rMin, float rMax) {
    float v =  ((pow(rMax, 2.0) - pow(r.x, 2.0) * 3.0) - uFeatherWidth - pow(r.y, 2.0)) / (2.0 * uFeatherWidth);
    float v2 =  ((pow(rMin, 2.0) - pow(r.x, 2.0) * 3.0) - uFeatherWidth - pow(r.y, 2.0)) / (2.0 * uFeatherWidth);
    float alpha = smoothstep(0.0, 1.0, v);
    float alpha2 = smoothstep(0.0, 1.0, v2);
    return alpha * (1.0 - alpha2);
}

// Rhomb
float featherRangeRhomb(vec2 r, float rMax) {
    float v = (rMax - abs(r.x) - uFeatherWidth - abs(r.y)) / (2.0 * uFeatherWidth);
    return smoothstep(0.0, 1.0, v);
}

float featherRangeRhomb(vec2 r, float rMin, float rMax) {
    float v = (rMax - abs(r.x) - uFeatherWidth - abs(r.y)) / (2.0 * uFeatherWidth);
    float v2 = (rMin - abs(r.x) - uFeatherWidth - abs(r.y)) / (2.0 * uFeatherWidth);
    float alpha = smoothstep(0.0, 1.0, v);
    float alpha2 = smoothstep(0.0, 1.0, v2);
    return alpha * (1.0 - alpha2);
}

// Square
float featherRangeSquare(vec2 r, float rMax) {
    r*= rot45;
    return featherRangeRhomb(r, rMax);
}

float featherRangeSquare(vec2 r, float rMin, float rMax) {
    r*= rot45;
    return featherRangeRhomb(r, rMin, rMax);
}

// Hexagon
// Calculates the minimum distance to a hexagon of a given radius
float distHex(vec2 r, float radius) {
    float height = radius * SIN_60;
    // Compare two sides at a time
    float dist = max(r.y - height, -height - r.y);
    for (int i = 0; i < 2; i++) {
        // Rotate by 60 degrees
        r*= rot60;
        float currentDist = max(r.y - height, -height - r.y);
        dist = max(dist, currentDist);
    }
    return dist;
}

vec2 distHex(vec2 r, vec2 radius) {
    vec2 height = radius * SIN_60;
    // Compare two sides at a time
    vec2 dist = max(r.y - height, -height - r.y);
    for (int i = 0; i < 2; i++) {
        // Rotate by 60 degrees
        r*= rot60;
        vec2 currentDist = max(r.y - height, -height - r.y);
        dist = max(dist, currentDist);
    }
    return dist;
}

vec2 distHexSelected(vec2 radius) {
    float dist = radius.x;
    for (int i = 0; i < 2; i++) {
        radius*= rot60;
        float currentDist = radius.x;
        dist = max(dist, currentDist);
    }
    return vec2(dist, dist);
}

float featherRangeHex(vec2 r, float rMax) {
    float maxDist = distHex(r, rMax);
    float v = (uFeatherWidth - maxDist) / (2.0 * uFeatherWidth);
    return smoothstep(0.0, 1.0, v);
}

float featherRangeHex(vec2 r, float rMin, float rMax) {
    vec2 maxDist = distHex(r, vec2(rMax, rMin));
    vec2 v = (uFeatherWidth - maxDist) / (2.0 * uFeatherWidth);
    vec2 alpha = smoothstep(0.0, 1.0, v);
    return alpha.x * (1.0 - alpha.y);
}

// Hexagon 2
float featherRangeHex2(vec2 r, float rMax) {
    r*= rot90;
    return featherRangeHex(r, rMax);
}

float featherRangeHex2(vec2 r, float rMin, float rMax) {
    r*= rot90;
    return featherRangeHex(r, rMin, rMax);
}

// Triangle Down
float distTriangleDown(vec2 r, float radius) {
    float height = radius * COS_60;
    float dist = r.y - height;
    for (int i = 0; i < 2; i++) {
        r*= rot120;
        float currentDist = r.y - height;
        dist = max(dist, currentDist);
    }
    return dist;
}

vec2 distTriangleDown(vec2 r, vec2 radius) {
    vec2 height = radius * COS_60;
    vec2 dist = r.y - height;
    for (int i = 0; i < 2; i++) {
        r*= rot120;
        vec2 currentDist = r.y - height;
        dist = max(dist, currentDist);
    }
    return dist;
}

vec2 distTriangleSelected(vec2 radius) {
    float dist = radius.x;
    for (int i = 0; i < 2; i++) {
        radius*= rot120;
        float currentDist = radius.x;
        dist = max(dist, currentDist);
    }
    return vec2(dist, dist);
}

float featherRangeTriangleDown(vec2 r, float rMax) {
    float maxDist = distTriangleDown(r, rMax);
    float v = (uFeatherWidth - maxDist) / (2.0 * uFeatherWidth);
    return smoothstep(0.0, 1.0, v);
}

float featherRangeTriangleDown(vec2 r, float rMin, float rMax) {
    vec2 maxDist = distTriangleDown(r, vec2(rMax, rMin));
    vec2 v = (uFeatherWidth - maxDist) / (2.0 * uFeatherWidth);
    vec2 alpha = smoothstep(0.0, 1.0, v);
    return alpha.x * (1.0 - alpha.y);
}

// Triangle Up
float featherRangeTriangleUp(vec2 r, float rMax) {
    r*= rot180;
    return featherRangeTriangleDown(r, rMax);
}

float featherRangeTriangleUp(vec2 r, float rMin, float rMax) {
    r*= rot180;
    return featherRangeTriangleDown(r, rMin, rMax);
}

// Cross
float featherRangeCross(vec2 r, float rMax) {
    float lineThickness = uLineThickness;
    float radius = length(r);
    if(rMax > radius) {
        if(r.y > -lineThickness && r.y < lineThickness){
            return 1.0;
        }
        if(r.x > -lineThickness && r.x < lineThickness){
            return 1.0;
        }
    }
    return 0.0;
}

float featherRangeCrossLined(vec2 r, float rMin, float rMax) {
    float lineThicknessMin = uLineThickness * 0.5;
    float lineThicknessMax = uLineThickness * 3.0;
    float radius = length(r);
    if(rMax > radius) {
        if((r.y > -lineThicknessMax && r.y < -lineThicknessMin) && (r.x < -lineThicknessMin || r.x > lineThicknessMin)) {
            return 1.0;
        }

        if((r.y < lineThicknessMax && r.y > lineThicknessMin) && (r.x < -lineThicknessMin || r.x > lineThicknessMin)) {
            return 1.0;
        }

        if(r.y > -uLineThickness && r.y < uLineThickness && abs(r.x) > rMin && abs(r.x) < rMax) {
            return 1.0;
        }

        if((r.x > -lineThicknessMax && r.x < -lineThicknessMin) && (r.y < -lineThicknessMin || r.y > lineThicknessMin)) {
            return 1.0;
        }

        if((r.x < lineThicknessMax && r.x > lineThicknessMin) && (r.y < -lineThicknessMin || r.y > lineThicknessMin)) {
            return 1.0;
        }

        if(r.x > -uLineThickness && r.x < uLineThickness && abs(r.y) > rMin && abs(r.y) < rMax) {
            return 1.0;
        }
    }
    
    return 0.0;
}

// X
float featherRangeX(vec2 r, float rMax) {
    r*= rot45;
    return featherRangeCross(r, rMax);
}

float featherRangeXLined(vec2 r, float rMin, float rMax) {
    r*= rot45;
    return featherRangeCrossLined(r, rMin, rMax);
}

bool isNaN(float val) {
    return val != val;
}

float drawOutline(vec2 posPixelSpace, float borderWidth, float rMin, float rMax) {
    vec2 pos = vec2(0.0, 0.0);
    vec2 pos2 = vec2(0.0, 0.0);
    switch(uShapeType){
        case BOX_FILLED:
        case BOX_LINED:
            pos = rMin + borderWidth - abs(posPixelSpace * rot45);
            return step(length(pos), length(posPixelSpace * rot45));
        case RHOMB_FILLED:
        case RHOMB_LINED:
            pos = rMin + borderWidth - abs(posPixelSpace);
            return step(length(pos), length(posPixelSpace));
        case CIRCLE_FILLED:
        case CIRCLE_LINED:
            return step(rMin + borderWidth, length(posPixelSpace));
        case ELLIPSE_FILLED:
        case ELLIPSE_LINED:
            pos.y = pow(rMin + borderWidth, 2.0) - pow(posPixelSpace.x, 2.0) * 3.0;
            pos.x = posPixelSpace.x * posPixelSpace.x;
            return step(pos.x + pos.y, pos.x + posPixelSpace.y * posPixelSpace.y);
        case HEXAGON_FILLED:
        case HEXAGON_LINED:
            pos = rMin + borderWidth - distHexSelected(vec2(rMin, rMin));
            pos2 = distHex(posPixelSpace, vec2(rMin, rMin));
            return step(length(pos), length(pos2));
        case HEXAGON_FILLED_2:
        case HEXAGON_LINED_2:
            pos = rMin + borderWidth - distHexSelected(vec2(rMin, rMin));
            pos2 = distHex(posPixelSpace * rot90, vec2(rMin, rMin));
            return step(length(pos), length(pos2));
        case TRIANGLE_FILLED_DOWN:
        case TRIANGLE_LINED_DOWN:
            pos = rMin + borderWidth - distTriangleSelected(vec2(rMin, rMin));
            pos2 = distTriangleDown(posPixelSpace, vec2(rMin, rMin));
            return step(length(pos), length(pos2));
        case TRIANGLE_FILLED_UP:
        case TRIANGLE_LINED_UP:
            pos = rMin + borderWidth - distTriangleSelected(vec2(rMin, rMin));
            pos2 = distTriangleDown(posPixelSpace * rot180, vec2(rMin, rMin));
            return step(length(pos), length(pos2));
        case CROSS_FILLED:
            return featherRangeCrossLined(posPixelSpace, rMin, rMax);
        case X_FILLED:
            return featherRangeCrossLined(posPixelSpace * rot45, rMin, rMax);
        default:
            return 0.0;
    }
}

float getAlphaValue(vec2 posPixelSpace, float rMin, float rMax) {
    switch(uShapeType){
        case BOX_FILLED:
            return featherRangeSquare(posPixelSpace, rMax);
        case BOX_LINED:
            return featherRangeSquare(posPixelSpace, rMin, rMax);
        case CIRCLE_FILLED:
            return featherRange(posPixelSpace, rMax);
        case CIRCLE_LINED:
            return featherRange(posPixelSpace, rMin, rMax);
        case HEXAGON_FILLED:
            return featherRangeHex(posPixelSpace, rMax);
        case HEXAGON_LINED:
            return featherRangeHex(posPixelSpace, rMin, rMax);
        case RHOMB_FILLED:
            return featherRangeRhomb(posPixelSpace, rMax);
        case RHOMB_LINED:
            return featherRangeRhomb(posPixelSpace, rMin, rMax);
        case TRIANGLE_FILLED_UP:
            return featherRangeTriangleUp(posPixelSpace, rMax);
        case TRIANGLE_LINED_UP:
            return featherRangeTriangleUp(posPixelSpace, rMin, rMax);
        case ELLIPSE_FILLED:
            return featherRangeEllipse(posPixelSpace, rMax);
        case ELLIPSE_LINED:
            return featherRangeEllipse(posPixelSpace, rMin, rMax);
        case TRIANGLE_FILLED_DOWN:
            return featherRangeTriangleDown(posPixelSpace, rMax);
        case TRIANGLE_LINED_DOWN:
            return featherRangeTriangleDown(posPixelSpace, rMin, rMax);
        case HEXAGON_FILLED_2:
            return featherRangeHex2(posPixelSpace, rMax);
        case HEXAGON_LINED_2:
            return featherRangeHex2(posPixelSpace, rMin, rMax);
        case CROSS_FILLED:
            return featherRangeCross(posPixelSpace, rMax);
        case CROSS_LINED:
            return featherRangeCrossLined(posPixelSpace, rMin, rMax);
        case X_FILLED:
            return featherRangeX(posPixelSpace, rMax);
        case X_LINED:
            return featherRangeXLined(posPixelSpace, rMin, rMax);
        default:
            return 0.0;
    }
}

void main() {
    vec2 posPixelSpace = (0.5 - gl_PointCoord) * (v_pointSize + uFeatherWidth);
    // to do rmin < 0?
    float rMax = v_pointSize * 0.5 - uLineThickness;
    float rMin = rMax - uLineThickness;
    // orientation
    if(uOmapEnabled && !isNaN(v_orientation)){
        posPixelSpace*= rotateMat(v_orientation);
    }
    float alpha = getAlphaValue(posPixelSpace, rMin, rMax);

    // highlight selected source
    float v = 0.0;
    float alpha2 = 0.0;
    if(v_selected == 1.0){
        float borderWidth = uLineThickness * 0.5;
        v = drawOutline(posPixelSpace, borderWidth, rMin, rMax);
        alpha2 = getAlphaValue(posPixelSpace, rMin, rMax + uLineThickness);
    }

    // Blending
    if (uCmapEnabled && !isNaN(v_colour)) {
        float x = clamp(v_colour, 0.0, 1.0);
        float cmapYVal = (float(uCmapIndex) + 0.5) / float(uNumCmaps);
        vec2 cmapCoords = vec2(x, cmapYVal);
        // outColor = vec4((1.0 - v) * texture(uCmapTexture, cmapCoords).xyz + v * uSelectedSourceColor, alpha);
        outColor = (1.0 - v) * vec4(texture(uCmapTexture, cmapCoords).xyz, alpha) + v * vec4(uSelectedSourceColor, alpha2);
    } else {
        // outColor = vec4((1.0 - v) * uPointColor + v * uSelectedSourceColor, alpha);
        outColor = (1.0 - v) * vec4(uPointColor, alpha) + v * vec4(uSelectedSourceColor, alpha2);
    }
}