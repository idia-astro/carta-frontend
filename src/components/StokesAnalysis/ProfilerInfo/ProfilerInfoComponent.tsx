import * as React from "react";
import {observer} from "mobx-react";
import {formattedNotation} from "utilities";
import "./ProfilerInfoComponent.css";

class StokesAnalysisProfilerInfoComponentProps {
    darkMode: boolean;
    cursorInfo: {isMouseEntered: boolean, quValue: { x: number, y: number}, channel: number, pi: number, pa: number, xUnit: string};
}

@observer
export class StokesAnalysisProfilerInfoComponent extends React.Component<StokesAnalysisProfilerInfoComponentProps> {
    private getCursorInfoLabel = () => {
        if (this.props.cursorInfo.quValue.x === null || this.props.cursorInfo.quValue.y === null ||
            isNaN(this.props.cursorInfo.quValue.x) || isNaN(this.props.cursorInfo.quValue.y)) {
            return null;
        }
        let xLabel = this.props.cursorInfo.xUnit === "Channel" ?
                    "Channel " + this.props.cursorInfo.channel.toFixed(0) :
                    formattedNotation(this.props.cursorInfo.channel) + " " + this.props.cursorInfo.xUnit;
        return "(" + xLabel 
                + ", q: " + this.props.cursorInfo.quValue.x.toExponential(2) 
                + ", u: " + this.props.cursorInfo.quValue.y.toExponential(2)
                + ", pi: " + this.props.cursorInfo.pi.toExponential(2)
                + ", pa: " + this.props.cursorInfo.pa.toFixed(2)
                + ")";
    };

    render() {
        let className = "profiler-info";
        if (this.props.darkMode) {
            className += " bp3-dark";
        }
        let cursorInfo = (this.props.cursorInfo) ? (
            <tr>
                <td className="td-label">
                    <pre>{this.props.cursorInfo.isMouseEntered ? "Cursor:" : "Data:"}</pre>
                </td>
                <td>
                    <pre>{this.getCursorInfoLabel()}</pre>
                </td>
            </tr>
        ) : null;

        return (
            <div className={className}>
                <table className="info-display">
                    <tbody>
                        {cursorInfo}
                    </tbody>
                </table>
            </div>
        );
    }
}
