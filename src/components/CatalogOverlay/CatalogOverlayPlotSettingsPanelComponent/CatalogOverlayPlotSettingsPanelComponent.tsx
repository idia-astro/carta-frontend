import {observer} from "mobx-react";
import {action, autorun, computed, observable} from "mobx";
import * as React from "react";
import {Button, FormGroup, Icon, MenuItem, NumericInput, PopoverPosition, Tab, Tabs, TabId} from "@blueprintjs/core";
import {Select, IItemRendererProps} from "@blueprintjs/select";
import {AppStore, CatalogStore, WidgetProps, WidgetConfig, HelpType, WidgetsStore} from "stores";
import {CatalogOverlayShape, CatalogWidgetStore} from "stores/widgets";
import {ColorResult} from "react-color";
import {ColorPickerComponent} from "components/Shared";
import {SWATCH_COLORS} from "utilities";
import "./CatalogOverlayPlotSettingsPanelComponent.css";

const IconWrapper = (path: React.SVGProps<SVGPathElement>, color: string, fill: boolean, strokeWidth = 2, viewboxDefault = 16) => {
    let fillColor = color;
    if (!fill) {
        fillColor = "none";
    }
    return (
        <span className="bp3-icon">
            <svg
                data-icon="triangle-up-open"
                width="16"
                height="16"
                viewBox={`0 0 ${viewboxDefault} ${viewboxDefault}`}
                style={{stroke: color, fill: fillColor, strokeWidth: strokeWidth}}
            >
                {path}
            </svg>
        </span>
    );
};

const triangleUp = <path d="M 2 14 L 14 14 L 8 3 Z"/>;
const triangleDown = <path d="M 2 2 L 14 2 L 8 13 Z"/>;
const diamond = <path d="M 8 14 L 14 8 L 8 2 L 2 8 Z"/>;
const hexagon = <path d="M 12.33 5.5 L 12.33 10.5 L 8 13 L 3.67 10.5 L 3.67 5.5 L 8 3 Z"/>;
const hexagon2 = <path d="M 3 8 L 5.5 3.67 L 10.5 3.67 L 13 8 L 10.5 12.33 L 5.5 12.33 Z"/>;

@observer
export class CatalogOverlayPlotSettingsPanelComponent extends React.Component<WidgetProps> {
    @observable catalogFileId: number;
    @observable selectedTab: TabId = "global";

    private catalogFileNames: Map<number, string>;

    public static get WIDGET_CONFIG(): WidgetConfig {
        return {
            id: "catalog-overlay-floating-settings",
            type: "floating-settings",
            minWidth: 280,
            minHeight: 225,
            defaultWidth: 550,
            defaultHeight: 375,
            title: "catalog-overlay-settings",
            isCloseable: true,
            parentId: "catalog-overlay",
            parentType: "catalog-overlay",
            helpType: HelpType.CATALOG_OVERLAY_SETTINGS
        };
    }

    @computed get widgetStore(): CatalogWidgetStore {
        const catalogStore = CatalogStore.Instance;
        const catalogWidgetStoreId = catalogStore.catalogWidgets.get(this.catalogFileId);
        return WidgetsStore.Instance.catalogWidgets.get(catalogWidgetStoreId);
    }

    constructor(props: WidgetProps) {
        super(props);
        this.catalogFileNames = new Map<number, string>();
        autorun(() => {
            const catalogStore = CatalogStore.Instance;
            this.catalogFileId = catalogStore.catalogProfiles.get(this.props.id);
            const catalogWidgetStoreId = catalogStore.catalogWidgets.get(this.catalogFileId);
            if (!catalogWidgetStoreId) {
                WidgetsStore.Instance.addCatalogWidget(this.catalogFileId);
            }
        });
    }

    @action handleCatalogFileChange = (fileId: number) => {
        CatalogStore.Instance.catalogProfiles.set(this.props.id, fileId);
    }

    private renderFileIdPopOver = (fileId: number, itemProps: IItemRendererProps) => {
        const fileName = this.catalogFileNames.get(fileId);
        let text = `${fileId}: ${fileName}`;
        return (
            <MenuItem
                key={fileId}
                text={text}
                onClick={itemProps.handleClick}
                active={itemProps.modifiers.active}
            />
        );
    }

    private renderShapePopOver = (shape: CatalogOverlayShape, itemProps: IItemRendererProps) => {
        const shapeItem = this.getCatalogShape(shape);
        return (
            <MenuItem
                icon={shapeItem}
                key={shape}
                onClick={itemProps.handleClick}
                active={itemProps.modifiers.active}
            />
        );
    }

    private getCatalogShape = (shape: CatalogOverlayShape) => {
        const widgetStore = this.widgetStore;
        let color = widgetStore.catalogColor;
        switch (shape) {
            case CatalogOverlayShape.Circle:
                return <Icon icon="circle" color={color}/>;
            case CatalogOverlayShape.FullCircle:
                return <Icon icon="full-circle" color={color}/>;  
            case CatalogOverlayShape.Star:
                return <Icon icon="star-empty" color={color}/>;
            case CatalogOverlayShape.FullStar:
                return <Icon icon="star" color={color}/>;
            case CatalogOverlayShape.Square:
                return <Icon icon="square" color={color}/>;
            case CatalogOverlayShape.Plus:
                return <Icon icon="plus" color={color}/>;
            case CatalogOverlayShape.Cross:
                return <Icon icon="cross" color={color}/>;
            case CatalogOverlayShape.TriangleUp:
                return IconWrapper(triangleUp, color, false);
            case CatalogOverlayShape.TriangleDown:
                return IconWrapper(triangleDown, color, false);
            case CatalogOverlayShape.Diamond:
                return IconWrapper(diamond, color, false);
            case CatalogOverlayShape.hexagon:
                return IconWrapper(hexagon, color, false);
            case CatalogOverlayShape.hexagon2:
                return IconWrapper(hexagon2, color, false);
            default:
                return <Icon icon="circle" color={color}/>;
        }
    }

    public render() {
        const appStore = AppStore.Instance;
        const widgetStore = this.widgetStore;
        const catalogStore = CatalogStore.Instance;
        const catalogFileIds = catalogStore.activeCatalogFiles;

        const tableSeparatorPosition = (100 - parseInt(widgetStore.tableSeparatorPosition));

        let catalogFileItems = [];
        catalogFileIds.forEach((value) => {
            catalogFileItems.push(value);
        });
        this.catalogFileNames = CatalogStore.Instance.getCatalogFileNames(catalogFileIds);
        const fileName = this.catalogFileNames.get(this.catalogFileId);
        let activeFileName = "";
        if (fileName !== undefined) {
            activeFileName = `${this.catalogFileId}: ${fileName}`;
        }
        const disabledOverlayPanel = catalogFileIds.length <= 0;

        const globalPanel = (
            <div className="panel-container">
                <FormGroup  inline={true} label="Displayed columns">
                    <NumericInput
                        placeholder="Default Displayed Columns"
                        min={0}
                        value={catalogStore.initDisplayedColumnSize}
                        stepSize={1}
                        onValueChange={(value: number) => catalogStore.setInitDisplayedColumnSize(value)}
                    />
                </FormGroup>
            </div>
        );

        const overlayPanel = (
            <div className="panel-container">
                 <FormGroup  inline={true} label="File" disabled={disabledOverlayPanel}>
                    <Select 
                        className="bp3-fill"
                        filterable={false}
                        disabled={disabledOverlayPanel}
                        items={catalogFileItems} 
                        activeItem={this.catalogFileId}
                        onItemSelect={this.handleCatalogFileChange}
                        itemRenderer={this.renderFileIdPopOver}
                        popoverProps={{popoverClassName: "catalog-select", minimal: true , position: PopoverPosition.AUTO_END}}
                    >
                        <Button text={activeFileName} rightIcon="double-caret-vertical"/>
                    </Select>
                </FormGroup>
                <FormGroup label={"Color"} inline={true} disabled={disabledOverlayPanel}>
                    <ColorPickerComponent
                        color={widgetStore.catalogColor}
                        disabled={disabledOverlayPanel}
                        presetColors={[...SWATCH_COLORS, "transparent"]}
                        setColor={(color: ColorResult) => {
                            widgetStore.setCatalogColor(color.hex === "transparent" ? "#000000" : color.hex);
                        }}
                        disableAlpha={true}
                        darkTheme={AppStore.Instance.darkTheme}
                    />
                </FormGroup>
                <FormGroup label={"Overlay Highlight"} inline={true} disabled={disabledOverlayPanel}>
                    <ColorPickerComponent
                        color={widgetStore.highlightColor}
                        disabled={disabledOverlayPanel}
                        presetColors={[...SWATCH_COLORS, "transparent"]}
                        setColor={(color: ColorResult) => {
                            widgetStore.setHighlightColor(color.hex === "transparent" ? "#000000" : color.hex);
                        }}
                        disableAlpha={true}
                        darkTheme={AppStore.Instance.darkTheme}
                    />
                </FormGroup>
                <FormGroup  inline={true} label="Shape" disabled={disabledOverlayPanel}>
                    <Select 
                        className="bp3-fill"
                        filterable={false}
                        disabled={disabledOverlayPanel}
                        items={Object.values(CatalogOverlayShape)} 
                        activeItem={widgetStore.catalogShape} 
                        onItemSelect={(item) => widgetStore.setCatalogShape(item)}
                        itemRenderer={this.renderShapePopOver}
                        popoverProps={{popoverClassName: "catalog-select", minimal: true , position: PopoverPosition.AUTO_END}}
                    >
                        <Button icon={this.getCatalogShape(widgetStore.catalogShape)} rightIcon="double-caret-vertical"/>
                    </Select>
                </FormGroup>
                <FormGroup  inline={true} label="Size" labelInfo="(px)" disabled={disabledOverlayPanel}>
                    <NumericInput
                        placeholder="Catalog Size"
                        disabled={disabledOverlayPanel}
                        min={CatalogWidgetStore.MinOverlaySize}
                        max={CatalogWidgetStore.MaxOverlaySize}
                        value={widgetStore.catalogSize}
                        stepSize={1}
                        onValueChange={(value: number) => widgetStore.setCatalogSize(value)}
                    />
                </FormGroup>
                <FormGroup  inline={true} label="Separator" labelInfo="(%)" disabled={disabledOverlayPanel}>
                    <NumericInput
                        disabled={disabledOverlayPanel}
                        min={CatalogWidgetStore.MinTableSeparatorPosition}
                        max={CatalogWidgetStore.MaxTableSeparatorPosition}
                        value={tableSeparatorPosition}
                        stepSize={1}
                        onValueChange={(value: number) => widgetStore.setTableSeparatorPosition(`${100 - value}%`)}
                    />
                </FormGroup>
            </div>
        );

        let className = "catalog-settings";
        if (appStore.darkTheme) {
            className += " bp3-dark";
        }

        return (
            <div className={className}>
                <Tabs
                    id="catalogSettings"
                    vertical={true}
                    selectedTabId={this.selectedTab}
                    onChange={(tabId) => this.selectedTab = tabId}
                >
                    <Tab id="global" title="Global" panel={globalPanel}/>
                    <Tab id="overlay" title="Overlay" panel={overlayPanel} disabled={disabledOverlayPanel}/>
                </Tabs>
            </div>
        );
    }
}