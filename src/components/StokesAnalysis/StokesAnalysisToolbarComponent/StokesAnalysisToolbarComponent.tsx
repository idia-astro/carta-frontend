import {observer} from "mobx-react";
import * as React from "react";
import {FormGroup, Switch} from "@blueprintjs/core";
import {AppStore} from "stores";
import {StokesAnalysisWidgetStore} from "stores/widgets";
import {RegionSelectorComponent, RegionSelectorType} from "components";
import "./StokesAnalysisToolbarComponent.css";

@observer
export class StokesAnalysisToolbarComponent extends React.Component<{widgetStore: StokesAnalysisWidgetStore, appStore: AppStore}> {

    private handleFractionalPolChanged = (changeEvent: React.ChangeEvent<HTMLInputElement>) => {
        this.props.widgetStore.setFractionalPolVisible(changeEvent.target.checked);
    };

    public render() {
        const appStore = this.props.appStore;
        const widgetStore = this.props.widgetStore;

        let enableFractionalPol = false;
        if (appStore.activeFrame && appStore.activeFrame.regionSet) {
            enableFractionalPol = appStore.activeFrame.frameInfo.fileInfoExtended.stokes > 1;
        }

        return (
            <div className="stokes-analysis-toolbar">
                <RegionSelectorComponent widgetStore={this.props.widgetStore} appStore={this.props.appStore} type={RegionSelectorType.CLOSED_AND_POINT_REGIONS}/>
                <FormGroup label={"Frac. Pol."} inline={true} disabled={!enableFractionalPol}>
                    <Switch checked={widgetStore.fractionalPolVisible} onChange={this.handleFractionalPolChanged} disabled={!enableFractionalPol}/>
                </FormGroup>
            </div>
        );
    }
}