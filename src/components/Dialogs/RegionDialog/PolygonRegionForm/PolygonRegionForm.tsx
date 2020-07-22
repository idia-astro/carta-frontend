import * as React from "react";
import {observer} from "mobx-react";
import {observable} from "mobx";
import {H5, InputGroup, NumericInput, Classes} from "@blueprintjs/core";
import {CARTA} from "carta-protobuf";
import {AppStore, RegionCoordinate, RegionStore} from "stores";
import {Point2D, WCSPoint2D} from "models";
import {closeTo, getFormattedWCSPoint, getPixelValueFromWCS, WCS_REGEXP} from "utilities";
import {CoordinateComponent} from "../CoordinateComponent/CoordinateComponent";
import "./PolygonRegionForm.css";

const KEYCODE_ENTER = 13;

@observer
export class PolygonRegionForm extends React.Component<{ region: RegionStore, wcsInfo: number }> {
    @observable displayColorPicker: boolean;

    private static readonly REGION_PIXEL_EPS = 1.0e-3;

    private handleNameChange = (ev) => {
        this.props.region.setName(ev.currentTarget.value);
    };

    private handlePointChange = (index: number, isXCoordinate: boolean, ev) => {
        if (ev.type === "keydown" && ev.keyCode !== KEYCODE_ENTER) {
            return;
        }

        const region = this.props.region;

        const valueString = ev.currentTarget.value;
        const value = parseFloat(valueString);
        const existingValue = isXCoordinate ? region.controlPoints[index].x : region.controlPoints[index].y;

        if (isFinite(value) && !closeTo(value, existingValue, PolygonRegionForm.REGION_PIXEL_EPS)) {
            if (isXCoordinate) {
                this.props.region.setControlPoint(index, {x: value, y: this.props.region.controlPoints[index].y});
            } else {
                this.props.region.setControlPoint(index, {x: this.props.region.controlPoints[index].x, y: value});
            }
            return;
        }

        ev.currentTarget.value = existingValue;
    };

    private handleWCSPointChange = (index: number, isXCoordinate: boolean, ev) => {
        if (ev.type === "keydown" && ev.keyCode !== KEYCODE_ENTER) {
            return;
        }
        const region = this.props.region;
        const pointWCS = getFormattedWCSPoint(this.props.wcsInfo, region.controlPoints[index]);
        if (!pointWCS) {
            return;
        }

        const wcsString = ev.currentTarget.value;
        if (wcsString === (isXCoordinate ? pointWCS.x : pointWCS.y)) {
            return;
        }
        if (WCS_REGEXP.test(wcsString)) {
            const newPoint = getPixelValueFromWCS(this.props.wcsInfo, isXCoordinate ? {x: wcsString, y: pointWCS.y} : {x: pointWCS.x, y: wcsString});
            if (!newPoint) {
                return;
            }
            const value = isXCoordinate ? newPoint.x : newPoint.y;
            const existingValue = isXCoordinate ? region.controlPoints[index].x : region.controlPoints[index].y;

            if (isFinite(value) && !closeTo(value, existingValue, PolygonRegionForm.REGION_PIXEL_EPS)) {
                this.props.region.setControlPoint(index, newPoint);
                return;
            }
        }

        ev.currentTarget.value = isXCoordinate ? pointWCS.x : pointWCS.y;
    };

    public render() {
        // dummy variable related wcs to trigger re-render
        const system = AppStore.Instance.overlayStore.global.explicitSystem;
        const formatX = AppStore.Instance.overlayStore.numbers.formatStringX;
        const formatY = AppStore.Instance.overlayStore.numbers.formatStringY;
        const region = this.props.region;
        if (!region || !region.isValid || region.regionType !== CARTA.RegionType.POLYGON) {
            return null;
        }

        const pxUnitSpan = region.coordinate === RegionCoordinate.Image ? <span className={Classes.TEXT_MUTED}>(px)</span> : "";
        const pointRows = region.controlPoints.map((point, index) => {
            const pointWCS = getFormattedWCSPoint(this.props.wcsInfo, point);
            let xInput, yInput;
            if (region.coordinate === RegionCoordinate.Image) {
                xInput = (
                    <NumericInput
                        selectAllOnFocus={true}
                        buttonPosition="none"
                        placeholder="X Coordinate"
                        value={point.x}
                        onBlur={(evt) => this.handlePointChange(index, true, evt)}
                        onKeyDown={(evt) => this.handlePointChange(index, true, evt)}
                    />
                );
                yInput = (
                    <NumericInput
                        selectAllOnFocus={true}
                        buttonPosition="none"
                        placeholder="Y Coordinate"
                        value={point.y}
                        onBlur={(evt) => this.handlePointChange(index, false, evt)}
                        onKeyDown={(evt) => this.handlePointChange(index, false, evt)}
                    />
                );
            } else {
                xInput = (
                    <NumericInput
                        allowNumericCharactersOnly={false}
                        buttonPosition="none"
                        placeholder="X WCS Coordinate"
                        disabled={!this.props.wcsInfo || !pointWCS}
                        value={pointWCS ? pointWCS.x : ""}
                        onBlur={(evt) => this.handleWCSPointChange(index, true, evt)}
                        onKeyDown={(evt) => this.handleWCSPointChange(index, true, evt)}
                    />
                );
                yInput = (
                    <NumericInput
                        allowNumericCharactersOnly={false}
                        buttonPosition="none"
                        placeholder="Y WCS Coordinate"
                        disabled={!this.props.wcsInfo || !pointWCS}
                        value={pointWCS ? pointWCS.y : ""}
                        onBlur={(evt) => this.handleWCSPointChange(index, false, evt)}
                        onKeyDown={(evt) => this.handleWCSPointChange(index, false, evt)}
                    />
                );
            }
            const infoString = region.coordinate === RegionCoordinate.Image ? `WCS: ${WCSPoint2D.ToString(pointWCS)}` : `Image: ${Point2D.ToString(point, "px", 3)}`;
            return (
                <tr key={index}>
                    <td>Point {index} {pxUnitSpan}</td>
                    <td>{xInput}</td>
                    <td>{yInput}</td>
                    <td><span className="info-string">{infoString}</span></td>
                </tr>
            );
        });
        return (
            <div className="form-section polygon-region-form">
                <H5>Properties</H5>
                <div className="form-contents">
                    <table>
                        <tbody>
                        <tr>
                            <td>Region Name</td>
                            <td colSpan={2}>
                                <InputGroup placeholder="Enter a region name" value={region.name} onChange={this.handleNameChange}/>
                            </td>
                        </tr>
                        <tr>
                            <td>Coordinate</td>
                            <td colSpan={2}><CoordinateComponent region={region} disableCooridnate={!this.props.wcsInfo}/></td>
                        </tr>
                        {pointRows}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}