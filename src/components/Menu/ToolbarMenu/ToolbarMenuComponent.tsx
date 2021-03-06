import * as React from "react";
import {observer} from "mobx-react";
import {AnchorButton, ButtonGroup, Position} from "@blueprintjs/core";
import {Tooltip2} from "@blueprintjs/popover2";
import {AppStore, RegionMode, WidgetsStore} from "stores";
import {ImageViewLayer} from "components";
import {RegionCreationMode} from "models";
import {IconName} from "@blueprintjs/icons";
import {CustomIcon, CustomIconName} from "icons/CustomIcons";
import {CARTA} from "carta-protobuf";
import "./ToolbarMenuComponent.scss";

@observer
export class ToolbarMenuComponent extends React.Component {
    handleRegionTypeClicked = (type: CARTA.RegionType) => {
        const appStore = AppStore.Instance;
        appStore.updateActiveLayer(ImageViewLayer.RegionCreating);
        appStore.activeFrame.regionSet.setNewRegionType(type);
        appStore.activeFrame.regionSet.setMode(RegionMode.CREATING);
    };

    regionTooltip = (shape: string) => {
        const regionModeIsCenter = AppStore.Instance.preferenceStore.regionCreationMode === RegionCreationMode.CENTER;
        return (
            <span>
                <br />
                <i>
                    <small>
                        Click-and-drag to define a region ({regionModeIsCenter ? "center to corner" : "corner to corner"}).
                        <br />
                        Hold Ctrl to define a region ({regionModeIsCenter ? "corner to corner" : "center to corner"}).
                        <br />
                        Change the default creation mode in Preferences.
                        <br />
                        Hold shift key to create a {shape}.
                    </small>
                </i>
            </span>
        );
    };

    public render() {
        const appStore = AppStore.Instance;
        const dialogStore = appStore.dialogStore;

        let className = "toolbar-menu";
        let dialogClassName = "dialog-toolbar-menu";
        let actionsClassName = "actions-toolbar-menu";
        if (appStore.darkTheme) {
            className += " bp3-dark";
            dialogClassName += " bp3-dark";
            actionsClassName += " bp3-dark";
        }
        const isRegionCreating = appStore.activeFrame ? appStore.activeFrame.regionSet.mode === RegionMode.CREATING : false;
        const newRegionType = appStore.activeFrame ? appStore.activeFrame.regionSet.newRegionType : CARTA.RegionType.RECTANGLE;
        const regionButtonsDisabled = !appStore.activeFrame || appStore.activeLayer === ImageViewLayer.Catalog;

        const commonTooltip = (
            <span>
                <br />
                <i>
                    <small>
                        Drag to place docked widget
                        <br />
                        Click to place a floating widget
                    </small>
                </i>
            </span>
        );
        return (
            <React.Fragment>
                <ButtonGroup className={actionsClassName}>
                    <Tooltip2 content={<span>Point</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={"symbol-square"} onClick={() => this.handleRegionTypeClicked(CARTA.RegionType.POINT)} active={isRegionCreating && newRegionType === CARTA.RegionType.POINT} disabled={regionButtonsDisabled} />
                    </Tooltip2>
                    <Tooltip2 content={<span>Rectangle{this.regionTooltip("square")}</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={"square"} onClick={() => this.handleRegionTypeClicked(CARTA.RegionType.RECTANGLE)} active={isRegionCreating && newRegionType === CARTA.RegionType.RECTANGLE} disabled={regionButtonsDisabled} />
                    </Tooltip2>
                    <Tooltip2 content={<span>Ellipse{this.regionTooltip("circle")}</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={"circle"} onClick={() => this.handleRegionTypeClicked(CARTA.RegionType.ELLIPSE)} active={isRegionCreating && newRegionType === CARTA.RegionType.ELLIPSE} disabled={regionButtonsDisabled} />
                    </Tooltip2>
                    <Tooltip2
                        content={
                            <span>
                                Polygon
                                <span>
                                    <br />
                                    <i>
                                        <small>
                                            Define control points with a series of clicks.
                                            <br />
                                            Double-click to close the loop and finish polygon creation.
                                            <br />
                                            Double-click on a control point to delete it.
                                            <br />
                                            Click on a side to create a new control point.
                                        </small>
                                    </i>
                                </span>
                            </span>
                        }
                        position={Position.BOTTOM}
                    >
                        <AnchorButton icon={"polygon-filter"} onClick={() => this.handleRegionTypeClicked(CARTA.RegionType.POLYGON)} active={isRegionCreating && newRegionType === CARTA.RegionType.POLYGON} disabled={regionButtonsDisabled} />
                    </Tooltip2>
                </ButtonGroup>
                <ButtonGroup className={className}>
                    {Array.from(WidgetsStore.Instance.CARTAWidgets.keys()).map(widgetType => {
                        const widgetConfig = WidgetsStore.Instance.CARTAWidgets.get(widgetType);
                        const trimmedStr = widgetType.replace(/\s+/g, "");
                        return (
                            <Tooltip2
                                key={`${trimmedStr}Tooltip`}
                                content={
                                    <span>
                                        {widgetType}
                                        {commonTooltip}
                                    </span>
                                }
                            >
                                <AnchorButton
                                    icon={widgetConfig.isCustomIcon ? <CustomIcon icon={widgetConfig.icon as CustomIconName} /> : (widgetConfig.icon as IconName)}
                                    id={`${trimmedStr}Button`} // id particularly is for drag source in WidgetStore
                                    onClick={widgetConfig.onClick}
                                />
                            </Tooltip2>
                        );
                    })}
                </ButtonGroup>
                <ButtonGroup className={dialogClassName}>
                    <Tooltip2 content={<span>File Header</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={"app-header"} onClick={dialogStore.showFileInfoDialog} active={dialogStore.fileInfoDialogVisible} />
                    </Tooltip2>
                    <Tooltip2 content={<span>Preferences</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={"wrench"} onClick={dialogStore.showPreferenceDialog} active={dialogStore.preferenceDialogVisible} />
                    </Tooltip2>
                    <Tooltip2 content={<span>Contours</span>} position={Position.BOTTOM}>
                        <AnchorButton icon={<CustomIcon icon={"contour"} />} onClick={dialogStore.showContourDialog} active={dialogStore.contourDialogVisible} />
                    </Tooltip2>
                </ButtonGroup>
            </React.Fragment>
        );
    }
}
