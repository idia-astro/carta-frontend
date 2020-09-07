import {observer} from "mobx-react";
import * as React from "react";
import {FormGroup, HTMLSelect, IOptionProps} from "@blueprintjs/core";
import {HistogramWidgetStore} from "stores/widgets";
import {RegionSelectorComponent} from "components";
import "./HistogramToolbarComponent.css";

@observer
export class HistogramToolbarComponent extends React.Component<{ widgetStore: HistogramWidgetStore}> {

    private handleStokesChanged = (changeEvent: React.ChangeEvent<HTMLSelectElement>) => {
        const frame = this.props.widgetStore.effectiveFrame;
        frame.setChannels(frame.requiredChannel, parseInt(changeEvent.target.value), true);
    }

    public render() {

        const widgetStore = this.props.widgetStore;
        const frame = widgetStore.effectiveFrame;
        const hasStokes = frame.hasStokes;
        const stokesOptions: IOptionProps[] = [];
        if (hasStokes) {
            frame.stokesInfo.forEach( (stokes, index) => stokesOptions.push({value: index, label: stokes}) );
        }

        return (
            <div className="spectral-profiler-toolbar">
                <RegionSelectorComponent widgetStore={widgetStore}/>
                <FormGroup label={"Stokes"} inline={true} disabled={!hasStokes}>
                    <HTMLSelect value={hasStokes ? frame.requiredStokes : 0} options={stokesOptions} onChange={this.handleStokesChanged} disabled={!hasStokes}/>
                </FormGroup>
            </div>
        );
    }
}