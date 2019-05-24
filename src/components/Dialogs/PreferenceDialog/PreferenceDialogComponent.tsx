import * as React from "react";
import {observer} from "mobx-react";
import {Select, ItemRenderer} from "@blueprintjs/select";
import {Button, IDialogProps, Intent, Tab, Tabs, IconName, MenuItem, FormGroup} from "@blueprintjs/core";
import {DraggableDialogComponent} from "components/Dialogs";
import {AppStore} from "stores";
import "./PreferenceDialogComponent.css";

@observer
export class PreferenceDialogComponent extends React.Component<{ appStore: AppStore }> {
    public render() {
        const appStore = this.props.appStore;
        const preferenceStore = appStore.preferencesStore;

        const globalPanel = (
            <div className="panel-container">
                <FormGroup inline={true} label="Theme"></FormGroup>
            </div>
        );

        const renderConfigPanel = (
            <div className="panel-container">
                <FormGroup inline={true} label="Scaling"></FormGroup>
                <FormGroup inline={true} label="Color map"></FormGroup>
                <FormGroup inline={true} label="Percentile Ranks"></FormGroup>
            </div>
        );

        let className = "preference-dialog";
        if (appStore.darkTheme) {
            className += " bp3-dark";
        }

        const dialogProps: IDialogProps = {
            icon: "heart",
            backdropClassName: "minimal-dialog-backdrop",
            className: className,
            canOutsideClickClose: false,
            lazy: true,
            isOpen: appStore.preferenceDialogVisible,
            onClose: appStore.hidePreferenceDialog,
            title: "Preference",
        };

        return (
            <DraggableDialogComponent dialogProps={dialogProps} minWidth={300} minHeight={300} defaultWidth={600} defaultHeight={450} enableResizing={true}>
                <div className="bp3-dialog-body">
                    <Tabs
                        id="preferenceTabs"
                        vertical={true}
                        selectedTabId={preferenceStore.perferenceSelectedTab}
                        onChange={(tabId) => preferenceStore.setPreferenceSelectedTab(String(tabId))}
                    >
                        <Tab id="global" title="Global" panel={globalPanel}/>
                        <Tab id="renderConfig" title="Render Config" panel={renderConfigPanel}/>
                    </Tabs>
                </div>
                <div className="bp3-dialog-footer">
                    <div className="bp3-dialog-footer-actions">
                        <Button intent={Intent.PRIMARY} onClick={appStore.hidePreferenceDialog} text="Close"/>
                    </div>
                </div>
            </DraggableDialogComponent>
        );
    }
}
