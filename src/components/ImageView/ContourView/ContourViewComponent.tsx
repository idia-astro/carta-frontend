import {observer} from "mobx-react";
import * as React from "react";
import {AppStore, ContourDashMode, FrameStore, OverlayStore, RenderConfigStore} from "stores";
import {getShaderFromString, GL, loadImageTexture, rotate2D, scale2D, subtract2D} from "utilities";
import "./ContourViewComponent.css";
import allMaps from "static/allmaps.png";

const vertexShaderLine = require("!raw-loader!./GLSL/vert_line.glsl");
const pixelShaderDashed = require("!raw-loader!./GLSL/pixel_dashed.glsl");

export interface ContourViewComponentProps {
    overlaySettings: OverlayStore;
    appStore: AppStore;
    docked: boolean;
}

interface ShaderUniforms {
    RangeScale: WebGLUniformLocation;
    RangeOffset: WebGLUniformLocation;
    RotationOrigin: WebGLUniformLocation;
    RotationAngle: WebGLUniformLocation;
    ScaleAdjustment: WebGLUniformLocation;
    DashLength: WebGLUniformLocation;
    LineColor: WebGLUniformLocation;
    LineThickness: WebGLUniformLocation;
    CmapEnabled: WebGLUniformLocation;
    CmapValue: WebGLUniformLocation;
    CmapTexture: WebGLUniformLocation;
    NumCmaps: WebGLUniformLocation;
    CmapIndex: WebGLUniformLocation;
    Bias: WebGLUniformLocation;
    Contrast: WebGLUniformLocation;
    ControlMapEnabled: WebGLUniformLocation;
    ControlMapSize: WebGLUniformLocation;
    ControlMapTexture: WebGLUniformLocation;
    ControlMapMin: WebGLUniformLocation;
    ControlMapMax: WebGLUniformLocation;
}

@observer
export class ContourViewComponent extends React.Component<ContourViewComponentProps> {
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext;
    private cmapTexture: WebGLTexture;

    // Shader attribute handles
    private vertexPositionAttribute: number;
    private vertexNormalAttribute: number;
    private shaderUniforms: ShaderUniforms;

    componentDidMount() {
        if (this.canvas) {
            try {
                this.gl = this.canvas.getContext("webgl");
                if (!this.gl) {
                    return;
                }
                this.props.appStore.ContourContext = this.gl;
            } catch (e) {
                console.log(e);
            }

            const extTextureFloat = this.gl.getExtension("OES_texture_float");
            const extTextureFloatLinear = this.gl.getExtension("OES_texture_float_linear");

            if (!this.gl || !extTextureFloat || !extTextureFloatLinear) {
                console.error("Could not initialise WebGL");
            }

            this.initShaders();
            loadImageTexture(this.gl, allMaps, WebGLRenderingContext.TEXTURE0).then(texture => {
                this.cmapTexture = texture;
                this.updateCanvas();
            });
        }
    }

    componentDidUpdate() {
        requestAnimationFrame(this.updateCanvas);
    }

    private resizeAndClearCanvas() {
        const frame = this.props.appStore.activeFrame;
        if (!frame) {
            return;
        }

        const reqWidth = Math.max(1, frame.renderWidth * devicePixelRatio);
        const reqHeight = Math.max(1, frame.renderHeight * devicePixelRatio);
        // Resize canvas if necessary
        if (this.canvas.width !== reqWidth || this.canvas.height !== reqHeight) {
            this.canvas.width = reqWidth;
            this.canvas.height = reqHeight;
            this.gl.viewport(0, 0, reqWidth, reqHeight);
        } else {
            // Otherwise just clear it
            this.gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT);
        }
    }

    private updateCanvas = () => {
        const frame = this.props.appStore.activeFrame;
        if (frame && this.canvas && this.gl && this.shaderUniforms) {
            this.resizeAndClearCanvas();
            if (frame.contourConfig.visible && frame.contourConfig.enabled) {
                this.renderFrameContours(frame, true);
            }
            if (frame.secondaryImages) {
                for (const secondaryFrame of frame.secondaryImages) {
                    if (secondaryFrame.contourConfig.visible && secondaryFrame.contourConfig.enabled) {
                        this.renderFrameContours(secondaryFrame, false);
                    }
                }
            }
        }
    };

    private renderFrameContours = (frame: FrameStore, isActive: boolean) => {
        const zoomLevel = frame.spatialReference ? frame.spatialReference.zoomLevel * frame.spatialTransform.scale : frame.zoomLevel;
        // update uniforms
        this.gl.uniform1i(this.shaderUniforms.CmapEnabled, frame.contourConfig.colormapEnabled ? 1 : 0);
        if (frame.contourConfig.colormapEnabled) {
            this.gl.uniform1i(this.shaderUniforms.CmapIndex, RenderConfigStore.COLOR_MAPS_ALL.indexOf(frame.contourConfig.colormap));
            this.gl.uniform1f(this.shaderUniforms.Bias, frame.contourConfig.colormapBias);
            this.gl.uniform1f(this.shaderUniforms.Contrast, frame.contourConfig.colormapContrast);
        }

        if (isActive) {
            this.gl.uniform1i(this.shaderUniforms.ControlMapEnabled, 0);
            this.gl.uniform1i(this.shaderUniforms.ControlMapTexture, 0);
            const thickness = devicePixelRatio * frame.contourConfig.thickness / zoomLevel;
            this.gl.uniform1f(this.shaderUniforms.LineThickness, thickness);

            if (frame.spatialReference) {
                let rotationOrigin = frame.spatialTransform.origin;
                const rangeScale = {
                    x: 1.0 / (frame.spatialReference.requiredFrameView.xMax - frame.spatialReference.requiredFrameView.xMin),
                    y: 1.0 / (frame.spatialReference.requiredFrameView.yMax - frame.spatialReference.requiredFrameView.yMin),
                };

                // Instead of rotating and scaling about an origin on the GPU (float32), we take this out of the shader, and perform beforehand (float64, and consistent)
                const originAdjustedOffset = subtract2D(frame.spatialTransform.origin, scale2D(rotate2D(frame.spatialTransform.origin, frame.spatialTransform.rotation), frame.spatialTransform.scale));

                const rangeOffset = {
                    x: (frame.spatialTransform.translation.x - frame.spatialReference.requiredFrameView.xMin + originAdjustedOffset.x) * rangeScale.x,
                    y: (frame.spatialTransform.translation.y - frame.spatialReference.requiredFrameView.yMin + originAdjustedOffset.y) * rangeScale.y
                };

                this.gl.uniform2f(this.shaderUniforms.RangeScale, rangeScale.x, rangeScale.y);
                this.gl.uniform2f(this.shaderUniforms.RangeOffset, rangeOffset.x, rangeOffset.y);
                this.gl.uniform2f(this.shaderUniforms.RotationOrigin, rotationOrigin.x, rotationOrigin.y);
                this.gl.uniform1f(this.shaderUniforms.RotationAngle, -frame.spatialTransform.rotation);
                this.gl.uniform1f(this.shaderUniforms.ScaleAdjustment, frame.spatialTransform.scale);

            } else {
                const rangeScale = {
                    x: 1.0 / (frame.requiredFrameView.xMax - frame.requiredFrameView.xMin),
                    y: 1.0 / (frame.requiredFrameView.yMax - frame.requiredFrameView.yMin),
                };
                const rangeOffset = {
                    x: -frame.requiredFrameView.xMin * rangeScale.x,
                    y: -frame.requiredFrameView.yMin * rangeScale.y
                };

                this.gl.uniform2f(this.shaderUniforms.RangeScale, rangeScale.x, rangeScale.y);
                this.gl.uniform2f(this.shaderUniforms.RangeOffset, rangeOffset.x, rangeOffset.y);
                this.gl.uniform1f(this.shaderUniforms.RotationAngle, 0.0);
                this.gl.uniform1f(this.shaderUniforms.ScaleAdjustment, 1.0);
            }
        } else {
            const controlMap = frame.controlMaps.get(frame.spatialReference);
            this.gl.uniform1i(this.shaderUniforms.ControlMapEnabled, 1);
            this.gl.uniform2f(this.shaderUniforms.ControlMapMin, controlMap.minPoint.x, controlMap.minPoint.y);
            this.gl.uniform2f(this.shaderUniforms.ControlMapMax, controlMap.maxPoint.x, controlMap.maxPoint.y);
            this.gl.uniform2f(this.shaderUniforms.ControlMapSize, controlMap.width, controlMap.height);
            this.gl.activeTexture(GL.TEXTURE1);
            this.gl.bindTexture(GL.TEXTURE_2D, controlMap.getTextureX(this.gl));
            this.gl.uniform1i(this.shaderUniforms.ControlMapTexture, 1);

            const rangeScale = {
                x: 1.0 / (frame.spatialReference.requiredFrameView.xMax - frame.spatialReference.requiredFrameView.xMin),
                y: 1.0 / (frame.spatialReference.requiredFrameView.yMax - frame.spatialReference.requiredFrameView.yMin),
            };

            const rangeOffset = {
                x: -frame.spatialReference.requiredFrameView.xMin * rangeScale.x,
                y: -frame.spatialReference.requiredFrameView.yMin * rangeScale.y
            };

            this.gl.uniform2f(this.shaderUniforms.RangeOffset, rangeOffset.x, rangeOffset.y);
            this.gl.uniform2f(this.shaderUniforms.RangeScale, rangeScale.x, rangeScale.y);
            this.gl.uniform1f(this.shaderUniforms.LineThickness, devicePixelRatio * frame.contourConfig.thickness / frame.spatialReference.zoomLevel);
            this.gl.uniform1f(this.shaderUniforms.RotationAngle, 0.0);
            this.gl.uniform1f(this.shaderUniforms.ScaleAdjustment, 1.0);
        }

        // Calculates ceiling power-of-three value as a dash factor.
        const dashFactor = Math.pow(3.0, Math.ceil(Math.log(1.0 / zoomLevel) / Math.log(3)));
        if (frame.contourStores) {
            const levels = [];
            frame.contourStores.forEach((v, level) => levels.push(level));
            const minVal = Math.min(...levels);
            const maxVal = Math.max(...levels);

            const color = frame.contourConfig.color;
            if (color) {
                this.gl.uniform4f(this.shaderUniforms.LineColor, color.r / 255.0, color.g / 255.0, color.b / 255.0, color.a || 1.0);
            } else {
                this.gl.uniform4f(this.shaderUniforms.LineColor, 1, 1, 1, 1);
            }

            frame.contourStores.forEach((contourStore, level) => {
                if (frame.contourConfig.colormapEnabled) {
                    let levelFraction: number;
                    if (minVal !== maxVal) {
                        levelFraction = (level - minVal) / (maxVal - minVal);
                    } else {
                        levelFraction = 1.0;
                    }
                    this.gl.uniform1f(this.shaderUniforms.CmapValue, levelFraction);
                }

                // Dash length in canvas pixels
                const dashMode = frame.contourConfig.dashMode;
                const dashLength = (dashMode === ContourDashMode.Dashed || (dashMode === ContourDashMode.NegativeOnly && level < 0)) ? 8 : 0;
                this.gl.uniform1f(this.shaderUniforms.DashLength, devicePixelRatio * dashLength * dashFactor);

                // Update buffers
                for (let i = 0; i < contourStore.chunkCount; i++) {
                    contourStore.bindBuffer(i);
                    const numVertices = contourStore.numGeneratedVertices[i];
                    this.gl.vertexAttribPointer(this.vertexPositionAttribute, 3, WebGLRenderingContext.FLOAT, false, 16, 0);
                    this.gl.vertexAttribPointer(this.vertexNormalAttribute, 2, WebGLRenderingContext.SHORT, false, 16, 12);
                    this.gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, numVertices);
                }
            });
        }
    };

    private initShaders() {
        let vertexShader = getShaderFromString(this.gl, vertexShaderLine, WebGLRenderingContext.VERTEX_SHADER);
        let fragmentShader = getShaderFromString(this.gl, pixelShaderDashed, WebGLRenderingContext.FRAGMENT_SHADER);

        let shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, WebGLRenderingContext.LINK_STATUS)) {
            console.log("Could not initialise shaders");
        }

        this.gl.useProgram(shaderProgram);

        this.vertexPositionAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexPosition");
        this.gl.enableVertexAttribArray(this.vertexPositionAttribute);
        this.vertexNormalAttribute = this.gl.getAttribLocation(shaderProgram, "aVertexNormal");
        this.gl.enableVertexAttribArray(this.vertexNormalAttribute);

        this.shaderUniforms = {
            RangeScale: this.gl.getUniformLocation(shaderProgram, "uRangeScale"),
            RangeOffset: this.gl.getUniformLocation(shaderProgram, "uRangeOffset"),
            ScaleAdjustment: this.gl.getUniformLocation(shaderProgram, "uScaleAdjustment"),
            RotationOrigin: this.gl.getUniformLocation(shaderProgram, "uRotationOrigin"),
            RotationAngle: this.gl.getUniformLocation(shaderProgram, "uRotationAngle"),
            DashLength: this.gl.getUniformLocation(shaderProgram, "uDashLength"),
            LineColor: this.gl.getUniformLocation(shaderProgram, "uLineColor"),
            LineThickness: this.gl.getUniformLocation(shaderProgram, "uLineThickness"),
            CmapEnabled: this.gl.getUniformLocation(shaderProgram, "uCmapEnabled"),
            CmapValue: this.gl.getUniformLocation(shaderProgram, "uCmapValue"),
            CmapTexture: this.gl.getUniformLocation(shaderProgram, "uCmapTexture"),
            NumCmaps: this.gl.getUniformLocation(shaderProgram, "uNumCmaps"),
            CmapIndex: this.gl.getUniformLocation(shaderProgram, "uCmapIndex"),
            Contrast: this.gl.getUniformLocation(shaderProgram, "uContrast"),
            Bias: this.gl.getUniformLocation(shaderProgram, "uBias"),
            ControlMapEnabled: this.gl.getUniformLocation(shaderProgram, "uControlMapEnabled"),
            ControlMapSize: this.gl.getUniformLocation(shaderProgram, "uControlMapSize"),
            ControlMapMin: this.gl.getUniformLocation(shaderProgram, "uControlMapMin"),
            ControlMapMax: this.gl.getUniformLocation(shaderProgram, "uControlMapMax"),
            ControlMapTexture: this.gl.getUniformLocation(shaderProgram, "uControlMapTexture"),
        };

        this.gl.uniform1i(this.shaderUniforms.NumCmaps, 79);
        this.gl.uniform1i(this.shaderUniforms.CmapTexture, 0);
    }

    render() {
        // dummy values to trigger React's componentDidUpdate()
        const frame = this.props.appStore.activeFrame;
        if (frame) {
            const view = frame.requiredFrameView;
            const contourData = frame.contourStores;
            const config = frame.contourConfig;
            const thickness = config.thickness;
            const color = config.colormapEnabled ? config.colormap : config.color;
            const dashMode = config.dashMode;
            const bias = config.colormapBias;
            const contrast = config.colormapContrast;

            if (frame.secondaryImages) {
                const visibleSecondaries = frame.secondaryImages.map(f => f.contourConfig.enabled && f.contourConfig.visible);
            }

            const visible = frame.contourConfig.enabled && frame.contourConfig.visible;

            contourData.forEach(contourStore => {
                const numVertices = contourStore.vertexCount;
            });
        }
        const padding = this.props.overlaySettings.padding;
        let className = "contour-div";
        if (this.props.docked) {
            className += " docked";
        }
        return (
            <div className={className}>
                <canvas
                    className="contour-canvas"
                    ref={(ref) => this.canvas = ref}
                    style={{
                        top: padding.top,
                        left: padding.left,
                        width: frame ? frame.renderWidth || 1 : 1,
                        height: frame ? frame.renderHeight || 1 : 1
                    }}
                />
            </div>);
    }
}