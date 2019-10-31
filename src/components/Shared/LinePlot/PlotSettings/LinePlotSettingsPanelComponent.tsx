import * as React from "react";
import {observer} from "mobx-react";
import {FormGroup, Switch, NumericInput, Button} from "@blueprintjs/core";
import {ColorResult} from "react-color";
import {RegionStore} from "../../../../stores";
import {ColorPickerComponent, PlotTypeSelectorComponent, PlotType} from "../../../Shared";
import "./LinePlotSettingsPanelComponent.css";

export class LinePlotSettingsPanelComponentProps {
    darkMode: boolean;
    primaryDarkModeLineColor: string;
    secondaryDarkModeLineColor?: string;
    primaryLineColor: {colorHex: string, fixed: boolean};
    secondaryLineColor?: {colorHex: string, fixed: boolean};
    lineWidth: number;
    plotType: PlotType;
    linePlotPointSize: number;
    useWcsValues: boolean;
    meanRmsVisible?: boolean;
    isAutoScaledX?: boolean;
    isAutoScaledY?: boolean;
    setPrimaryLineColor: (colorHex: string, fixed: boolean) => void;
    setSecondaryLineColor?: (colorHex: string, fixed: boolean) => void;
    setLineWidth: (val: number) => void;
    setLinePlotPointSize: (val: number) => void;
    setPlotType: (val: PlotType) => void;
    handleWcsValuesChanged: (changeEvent: React.ChangeEvent<HTMLInputElement>) => void;
    handleMeanRmsChanged?: (changeEvent: React.ChangeEvent<HTMLInputElement>) => void;
    clearXYBounds?: () => void;
}

export enum LineSettings {
     MIN_LINE_WIDTH = 0.5,
     MAX_LINE_WIDTH = 10,
     MIN_LINE_POINT_SIZE = 0.5,
     MAX_POINT_SIZE = 10,
}

@observer
export class LinePlotSettingsPanelComponent extends React.Component<LinePlotSettingsPanelComponentProps> {

    private linePointSizeStepSize = 0.5;
    private lineWidthStepSize = 0.5;

    private getThemeDefaultColor (darkThemeLineColor: string, lineColor: {colorHex: string, fixed: boolean}): string {
        if (this.props.darkMode && !lineColor.fixed) {
            return darkThemeLineColor;
        }
        return lineColor.colorHex;
    }

    render() {
        const props = this.props;
        return (
            <div className="line-settings">
            <React.Fragment>
                <FormGroup inline={true} label="Primary Color">
                    <ColorPickerComponent
                        color={this.getThemeDefaultColor(props.primaryDarkModeLineColor, props.primaryLineColor)}
                        presetColors={[...RegionStore.SWATCH_COLORS, "transparent"]}
                        setColor={(color: ColorResult) => {
                            props.setPrimaryLineColor(color.hex === "transparent" ? "#000000" : color.hex, true);
                        }}
                        disableAlpha={true}
                        darkTheme={props.darkMode}
                    />
                </FormGroup>
                {props.secondaryDarkModeLineColor 
                    && props.secondaryLineColor
                    && props.setSecondaryLineColor 
                    &&  <FormGroup inline={true} label="Secondary Color">
                            <ColorPickerComponent
                                color={this.getThemeDefaultColor(props.secondaryDarkModeLineColor, props.secondaryLineColor)}
                                presetColors={[...RegionStore.SWATCH_COLORS, "transparent"]}
                                setColor={(color: ColorResult) => {
                                    props.setSecondaryLineColor(color.hex === "transparent" ? "#000000" : color.hex, true);
                                }}
                                disableAlpha={true}
                                darkTheme={props.darkMode}
                            />
                        </FormGroup>
                }
                <FormGroup  inline={true} label="Line Width" labelInfo="(px)">
                    <NumericInput
                            placeholder="Line Width"
                            min={LineSettings.MIN_LINE_WIDTH}
                            max={LineSettings.MAX_LINE_WIDTH}
                            value={props.lineWidth}
                            stepSize={this.lineWidthStepSize}
                            disabled={props.plotType === PlotType.POINTS}
                            onValueChange={(value: number) => props.setLineWidth(value)}
                    />
                </FormGroup>
                <FormGroup  inline={true} label="Point Size" labelInfo="(px)">
                    <NumericInput
                            placeholder="Point Size"
                            min={LineSettings.MIN_LINE_POINT_SIZE}
                            max={LineSettings.MAX_POINT_SIZE}
                            value={props.linePlotPointSize}
                            stepSize={this.linePointSizeStepSize}
                            disabled={props.plotType !== PlotType.POINTS}
                            onValueChange={(value: number) => props.setLinePlotPointSize(value)}
                    />
                </FormGroup>
                <FormGroup inline={true} label={"Use WCS Values"}>
                    <Switch checked={props.useWcsValues} onChange={props.handleWcsValuesChanged}/>
                </FormGroup>
                { typeof props.meanRmsVisible !== "undefined"
                    && props.handleMeanRmsChanged
                    &&  <FormGroup inline={true} label={"Show Mean/RMS"}>
                            <Switch checked={props.meanRmsVisible} onChange={props.handleMeanRmsChanged}/>
                        </FormGroup>
                }
                <FormGroup inline={true} label={"Line Style"}>
                    <PlotTypeSelectorComponent value={props.plotType} onValueChanged={props.setPlotType}/>
                </FormGroup>
                { typeof props.isAutoScaledX !== "undefined" 
                    &&  typeof props.isAutoScaledY !== "undefined"
                    &&  props.clearXYBounds
                    &&  <FormGroup inline={true} label={"Reset Range"}>
                            <Button icon={"zoom-to-fit"} small={true} disabled={props.isAutoScaledX && props.isAutoScaledY} onClick={props.clearXYBounds}>Reset Range</Button>
                        </FormGroup>
                }
            </React.Fragment>
            </div>
        );
    }
}
