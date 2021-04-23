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
#define LineSegment_FILLED 20

#define PI radians(180.0)
#define SQRT3 sqrt(3.0)
#define SIN_60 0.86602540378

#define LINEAR 0
#define LOG 1
#define SQRT 2
#define SQUARE 3
#define POWER 4
#define GAMMA 5

uniform sampler2D uPositionTexture;
uniform sampler2D uSizeTexture;
uniform sampler2D uColorTexture;
uniform sampler2D uOrientationTexture;
uniform sampler2D uSelectedSourceTexture;
uniform sampler2D uSizeMinorTexture;

uniform vec2 uFrameViewMin;
uniform vec2 uFrameViewMax;
uniform float uFeatherWidth;
uniform bool uSmapEnabled;
uniform float uPointSize;
uniform highp int uShapeType;
uniform bool uAreaMode;
uniform bool uShowSelectedSource;
uniform bool uSminorMapEnabled;
uniform bool uAreaModeMinor;
uniform bool uCmapEnabled;
uniform bool uOmapEnabled;

out float v_colour;
out float v_pointSize;
out float v_orientation;
out float v_selected;
out float v_minorSize;


vec4 getValueByIndexFromTexture(sampler2D texture, int index) {
    ivec2 size = textureSize(texture, 0);
    int row = index / size.x;
    int col = index - row * size.x;
    return texelFetch(texture, ivec2(col, row), 0);
}

vec2 imageToGL(vec2 imageVec) {
    return 2.0 * (imageVec - uFrameViewMin) / (uFrameViewMax - uFrameViewMin) - 1.0;
}

vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float getSquareSideByArea(float area, float minorSize) {
    switch (uShapeType) {
        case BOX_FILLED:
        case BOX_LINED:
        case RHOMB_FILLED:
        case RHOMB_LINED:
        case CROSS_FILLED:
        case CROSS_LINED:
        case X_FILLED:
        case X_LINED:
        case LineSegment_FILLED:
            return sqrt(area);
        case CIRCLE_FILLED:
        case CIRCLE_LINED:
            return sqrt(area / PI) * 2.0;
        case HEXAGON_FILLED:
        case HEXAGON_LINED:
        case HEXAGON_FILLED_2:
        case HEXAGON_LINED_2:
            return sqrt((2.0 * area) / (3.0 * SQRT3)) * SIN_60 * 2.0;
        case TRIANGLE_FILLED_UP:
        case TRIANGLE_LINED_UP:
        case TRIANGLE_FILLED_DOWN:
        case TRIANGLE_LINED_DOWN:
            return sqrt(area * 4.0 / SQRT3);
        case ELLIPSE_FILLED:
        case ELLIPSE_LINED:
            float side = sqrt(area / PI) * 2.0;
            if (minorSize >= 0.0 && area < minorSize) {
                side = sqrt(minorSize / PI) * 2.0;
            }   
            return side;
        default:
            return 0.0;
    }
}

bool isNaN(float val) {
    return val != val;
}

void main() {
    vec4 data = getValueByIndexFromTexture(uPositionTexture, gl_VertexID);
    vec4 selectedSource = getValueByIndexFromTexture(uSelectedSourceTexture, gl_VertexID);
    vec2 pos = data.xy;
    gl_Position = vec4(imageToGL(pos), 0.5, 1);

    v_colour = -1.0;
    v_orientation = -1.0;
    v_minorSize = -1.0;
    v_selected = selectedSource.x;
    v_pointSize = uPointSize;

    if (uCmapEnabled) {
        vec4 color = getValueByIndexFromTexture(uColorTexture, gl_VertexID);
        v_colour = color.x;
    }

    if (uOmapEnabled) {
        vec4 orientation = getValueByIndexFromTexture(uOrientationTexture, gl_VertexID);
        v_orientation = orientation.x;
    }

    if (uSmapEnabled) {
        vec4 sizeMajor = getValueByIndexFromTexture(uSizeTexture, gl_VertexID);
        float size = sizeMajor.x;
        if(!isNaN(size)) {
            v_pointSize = size;
        }
    }

    if (uAreaMode) {
        v_pointSize = getSquareSideByArea(v_pointSize, v_minorSize);
    }

    if (uShowSelectedSource) {
        if (selectedSource.x == 1.0) {
            gl_PointSize = v_pointSize + uFeatherWidth;
        } else {
            gl_PointSize = 0.0;
        }
    } else {
        gl_PointSize = v_pointSize + uFeatherWidth;
    }

    if (uSminorMapEnabled) {
        vec4 sizeMinor = getValueByIndexFromTexture(uSizeMinorTexture, gl_VertexID);
        v_minorSize = sizeMinor.x;
        if (uAreaModeMinor) {
            v_minorSize = getSquareSideByArea(v_pointSize, v_minorSize);
        }
        if (v_pointSize < v_minorSize) {
            gl_PointSize = v_minorSize + uFeatherWidth;
        }
    }
}