import * as React from "react";
import {observer} from "mobx-react";
import {Button, ButtonGroup, Icon, Tooltip} from "@blueprintjs/core";
import {AppStore, DialogStore, WidgetConfig} from "stores";
import {
    AnimatorComponent, 
    HistogramComponent, 
    LayerListComponent, 
    LogComponent, 
    RegionListComponent, 
    RenderConfigComponent, 
    SpatialProfilerComponent, 
    SpectralProfilerComponent, 
    StatsComponent, 
    StokesAnalysisComponent, 
    CatalogOverlayComponent
} from "components";
import {CustomIcon} from "icons/CustomIcons";
import "./ToolbarMenuComponent.css";
@observer
export class ToolbarMenuComponent extends React.Component {
    public static get DRAGSOURCE_WIDGETCONFIG_MAP(): Map<string, WidgetConfig> {
        return new Map<string, WidgetConfig>([
            ["renderConfigButton", RenderConfigComponent.WIDGET_CONFIG],
            ["layerListButton", LayerListComponent.WIDGET_CONFIG],
            ["logButton", LogComponent.WIDGET_CONFIG],
            ["animatorButton", AnimatorComponent.WIDGET_CONFIG],
            ["regionListButton", RegionListComponent.WIDGET_CONFIG],
            ["spatialProfilerButton", SpatialProfilerComponent.WIDGET_CONFIG],
            ["spectralProfilerButton", SpectralProfilerComponent.WIDGET_CONFIG],
            ["statsButton", StatsComponent.WIDGET_CONFIG],
            ["histogramButton", HistogramComponent.WIDGET_CONFIG],
            ["stokesAnalysisButton", StokesAnalysisComponent.WIDGET_CONFIG],
            ["catalogOverlayButton", CatalogOverlayComponent.WIDGET_CONFIG]
        ]);
    }

    public render() {
        const appStore = AppStore.Instance;
        const dialogStore = appStore.dialogStore;

        let className = "toolbar-menu";
        let dialogClassName = "dialog-toolbar-menu";
        if (appStore.darkTheme) {
            className += " bp3-dark";
            dialogClassName += " bp3-dark";
        }

        const commonTooltip = <span><br/><i><small>Drag to place docked widget<br/>Click to place a floating widget</small></i></span>;
        return (
            <React.Fragment>
                <ButtonGroup className={className}>
                    <Tooltip content={<span>Region List Widget{commonTooltip}</span>}>
                        <Button icon={<CustomIcon icon={"regionList"}/>} id="regionListButton" onClick={appStore.widgetsStore.createFloatingRegionListWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Log Widget{commonTooltip}</span>}>
                        <Button icon={"application"} id="logButton" onClick={appStore.widgetsStore.createFloatingLogWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Spatial Profiler{commonTooltip}</span>}>
                        <Button icon={<CustomIcon icon={"spatialProfiler"}/>} id="spatialProfilerButton" onClick={appStore.widgetsStore.createFloatingSpatialProfilerWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Spectral Profiler{commonTooltip}</span>}>
                        <Button icon={<CustomIcon icon={"spectralProfiler"}/>} id="spectralProfilerButton" onClick={appStore.widgetsStore.createFloatingSpectralProfilerWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Statistics Widget{commonTooltip}</span>}>
                        <Button icon={"calculator"} id="statsButton" onClick={appStore.widgetsStore.createFloatingStatsWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Histogram Widget{commonTooltip}</span>}>
                        <Button icon={"timeline-bar-chart"} id="histogramButton" onClick={appStore.widgetsStore.createFloatingHistogramWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Animator Widget{commonTooltip}</span>}>
                        <Button icon={"video"} id="animatorButton" onClick={appStore.widgetsStore.createFloatingAnimatorWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Render Config Widget{commonTooltip}</span>}>
                        <Button icon={"style"} id="renderConfigButton" onClick={appStore.widgetsStore.createFloatingRenderWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Stokes Analysis Widget{commonTooltip}</span>}>
                        <Button icon={<CustomIcon icon={"stokes"}/>} id="stokesAnalysisButton" onClick={appStore.widgetsStore.createFloatingStokesWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Image List Widget{commonTooltip}</span>}>
                        <Button icon={"layers"} id="layerListButton" onClick={appStore.widgetsStore.createFloatingLayerListWidget}/>
                    </Tooltip>
                    <Tooltip content={<span>Catalog Widget{commonTooltip}</span>}>
                        <Button icon={"heatmap"} id="catalogOverlayButton" onClick={appStore.widgetsStore.reloadFloatingCatalogOverlayWidget}/>
                    </Tooltip>
                </ButtonGroup>
                <ButtonGroup className={dialogClassName}>
                    <Tooltip content={<span>File Header</span>}>
                        <Button icon={"app-header"} onClick={dialogStore.showFileInfoDialog} className={dialogStore.fileInfoDialogVisible ? "bp3-active" : ""}/>
                    </Tooltip>
                    <Tooltip content={<span>Preferences</span>}>
                        <Button icon={"wrench"} onClick={dialogStore.showPreferenceDialog} className={dialogStore.preferenceDialogVisible ? "bp3-active" : ""}/>
                    </Tooltip>
                    <Tooltip content={<span>Overlay Settings</span>}>
                        <Button icon={"settings"} onClick={dialogStore.showOverlaySettings} className={dialogStore.overlaySettingsDialogVisible ? "bp3-active" : ""}/>
                    </Tooltip>
                    <Tooltip content={<span>Contours</span>}>
                        <Button icon={<CustomIcon icon={"contour"}/>} onClick={dialogStore.showContourDialog} className={dialogStore.contourDialogVisible ? "bp3-active" : ""}/>
                    </Tooltip>
                </ButtonGroup>
            </React.Fragment>
        );
    }
}