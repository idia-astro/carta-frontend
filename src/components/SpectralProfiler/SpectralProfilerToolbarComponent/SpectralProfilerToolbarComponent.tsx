import {observer} from "mobx-react";
import * as React from "react";
import {CARTA} from "carta-protobuf";
import {AnchorButton, ButtonGroup, Intent, Menu, MenuItem, Popover, Position, Tooltip} from "@blueprintjs/core";
import {AppStore} from "stores";
import {MultiProfileCategory, SpectralProfileWidgetStore, SpectralProfileSelectionStore} from "stores/widgets";
import {SpectralProfilerComponent, SpectralProfilerSettingsTabs} from "components";
import {CustomIcon} from "icons/CustomIcons";
import {SWATCH_COLORS} from "utilities";
import {LineOption} from "models";
import "./SpectralProfilerToolbarComponent.scss";

type MultiSelectItem = string | CARTA.StatsType;

class ProfileSelectionButtonComponentProps {
    categoryName: MultiProfileCategory;
    isActiveCategory: boolean;
    itemOptions: LineOption[];
    itemSelected: MultiSelectItem[];
    disabled: boolean;
    disableOptions?: boolean;
    hightlightDropDownButton?: boolean;
    onCategorySelect: () => void;
    onItemSelect: (item: MultiSelectItem, itemIndex: number, isMultipleSelectionMode: boolean) => void;
}

@observer
class ProfileSelectionButtonComponent extends React.Component<ProfileSelectionButtonComponentProps> {
    public render() {
        const itemOptions = this.props.itemOptions;
        const itemSelected = this.props.itemSelected;
        let dropdownText = "";
        if (itemOptions && itemSelected?.length > 0) {
            itemSelected.forEach((selectedItemValue, index) => {
                const selectedItemOption = itemOptions.find(item => item.value === selectedItemValue);
                if (selectedItemOption?.label) {
                    dropdownText += `${selectedItemOption.label}${index !== itemSelected.length - 1 ? "," : ""}`;
                }
            });
        }

        let dropdownButtonClassName = "dropdown-button";
        if (this.props.hightlightDropDownButton) {
            dropdownButtonClassName += " specific-selection";
        }
        if (AppStore.Instance.darkTheme) {
            dropdownButtonClassName += " dark-theme";
        }

        return (
            <ButtonGroup fill={true} className="category-set">
                <Tooltip content={`Click to enable/disable multiple profiles of ${this.props.categoryName}`} position={Position.TOP}>
                    <AnchorButton
                        text={this.props.categoryName}
                        active={this.props.isActiveCategory}
                        onClick={(ev) => this.props.onCategorySelect()}
                        disabled={this.props.disabled}
                    />
                </Tooltip>
                <Popover
                    content={
                        <Menu>
                            {this.props.itemOptions?.map((item, index) =>
                                <MenuItem
                                    key={item.value}
                                    text={item.label}
                                    disabled={item?.disabled}
                                    intent={item.hightlight ? Intent.PRIMARY : Intent.NONE}
                                    onClick={(ev) => this.props.onItemSelect(item.value, index, this.props.isActiveCategory)}
                                    icon={this.props.itemSelected?.includes(item.value) ? "tick" : "blank"}
                                    shouldDismissPopover={false}
                                />
                            )}
                        </Menu>
                    }
                    minimal={true}
                    placement={Position.BOTTOM}
                    disabled={this.props.disabled}
                >
                    <AnchorButton
                        text={<span className="overflow-text">{dropdownText}</span>}
                        className={dropdownButtonClassName}
                        rightIcon={"caret-down"}
                        disabled={this.props.disabled || this.props.disableOptions}
                    />
                </Popover>
            </ButtonGroup>
        );
    }
}

@observer
class ProfileSelectionComponent extends React.Component<{profileSelectionStore: SpectralProfileSelectionStore}> {
    // Frame selection does not allow multiple selection
    private onFrameItemClick = (selectedFrame: number, itemIndex: number, isMultipleSelectionMode: boolean) => {
        this.props.profileSelectionStore.selectFrame(selectedFrame);
    };

    private onRegionItemClick = (selectedRegion: number, itemIndex: number, isMultipleSelectionMode: boolean) => {
        const color = SWATCH_COLORS[itemIndex % SWATCH_COLORS.length];
        this.props.profileSelectionStore.selectRegion(selectedRegion, color, isMultipleSelectionMode);
    };

    private onStatsItemClick = (selectedStatsType: CARTA.StatsType, itemIndex: number, isMultipleSelectionMode: boolean) => {
        const color = SWATCH_COLORS[itemIndex % SWATCH_COLORS.length];
        this.props.profileSelectionStore.selectStatsType(selectedStatsType, color, isMultipleSelectionMode);
    };

    private onStokesItemClick = (selectedStokes: string, itemIndex: number, isMultipleSelectionMode: boolean) => {
        const color = SWATCH_COLORS[itemIndex % SWATCH_COLORS.length];
        this.props.profileSelectionStore.selectCoordinate(selectedStokes, color, isMultipleSelectionMode);
    };

    public render() {
        const profileSelectionStore = this.props.profileSelectionStore;
        const frame = profileSelectionStore.selectedFrame;

        return (
            <div className="profile-selection-panel">
                <ProfileSelectionButtonComponent
                    categoryName={MultiProfileCategory.IMAGE}
                    isActiveCategory={profileSelectionStore.activeProfileCategory === MultiProfileCategory.IMAGE}
                    itemOptions={profileSelectionStore.frameOptions}
                    itemSelected={[profileSelectionStore.selectedFrameFileId]}
                    disabled={!frame}
                    hightlightDropDownButton={profileSelectionStore.isSelectingSpecificFrame}
                    onCategorySelect={() => {
                        profileSelectionStore.setActiveProfileCategory(
                            profileSelectionStore.activeProfileCategory !== MultiProfileCategory.IMAGE ? MultiProfileCategory.IMAGE : MultiProfileCategory.NONE
                        );
                    }}
                    onItemSelect={this.onFrameItemClick}
                />
                <ProfileSelectionButtonComponent
                    categoryName={MultiProfileCategory.REGION}
                    isActiveCategory={profileSelectionStore.activeProfileCategory === MultiProfileCategory.REGION}
                    itemOptions={profileSelectionStore.regionOptions}
                    itemSelected={profileSelectionStore.selectedRegionIds}
                    disabled={!frame}
                    onCategorySelect={() => {
                        profileSelectionStore.setActiveProfileCategory(
                            profileSelectionStore.activeProfileCategory !== MultiProfileCategory.REGION ? MultiProfileCategory.REGION : MultiProfileCategory.NONE
                        );
                    }}
                    onItemSelect={this.onRegionItemClick}
                />
                <ProfileSelectionButtonComponent
                    categoryName={MultiProfileCategory.STATISTIC}
                    isActiveCategory={profileSelectionStore.activeProfileCategory === MultiProfileCategory.STATISTIC}
                    itemOptions={profileSelectionStore.statsTypeOptions}
                    itemSelected={profileSelectionStore.selectedStatsTypes}
                    disabled={!frame}
                    disableOptions={!profileSelectionStore.isStatsTypeSelectionAvailable}
                    onCategorySelect={() => {
                        profileSelectionStore.setActiveProfileCategory(
                            profileSelectionStore.activeProfileCategory !== MultiProfileCategory.STATISTIC ? MultiProfileCategory.STATISTIC : MultiProfileCategory.NONE
                        );
                    }}
                    onItemSelect={this.onStatsItemClick}
                />
                <ProfileSelectionButtonComponent
                    categoryName={MultiProfileCategory.STOKES}
                    isActiveCategory={profileSelectionStore.activeProfileCategory === MultiProfileCategory.STOKES}
                    itemOptions={profileSelectionStore.coordinateOptions}
                    itemSelected={profileSelectionStore.selectedCoordinates}
                    disabled={!frame}
                    disableOptions={!(frame?.hasStokes)}
                    onCategorySelect={() => {
                        profileSelectionStore.setActiveProfileCategory(
                            profileSelectionStore.activeProfileCategory !== MultiProfileCategory.STOKES ? MultiProfileCategory.STOKES : MultiProfileCategory.NONE
                        );
                    }}
                    onItemSelect={this.onStokesItemClick}
                />
            </div>
        );
    }
}

@observer
export class SpectralProfilerToolbarComponent extends React.Component<{ widgetStore: SpectralProfileWidgetStore, id: string }> {
    private smoothingShortcutClick = () => {
        this.props.widgetStore.setSettingsTabId(SpectralProfilerSettingsTabs.SMOOTHING);
        AppStore.Instance.widgetsStore.createFloatingSettingsWidget(SpectralProfilerComponent.WIDGET_CONFIG.title, this.props.id, SpectralProfilerComponent.WIDGET_CONFIG.type);
    };

    private momentsShortcutClick = () => {
        this.props.widgetStore.setSettingsTabId(SpectralProfilerSettingsTabs.MOMENTS);
        AppStore.Instance.widgetsStore.createFloatingSettingsWidget(SpectralProfilerComponent.WIDGET_CONFIG.title, this.props.id, SpectralProfilerComponent.WIDGET_CONFIG.type);
    };

    public render() {
        const widgetStore = this.props.widgetStore;
        return (
            <div className="spectral-profiler-toolbar">
                <ProfileSelectionComponent profileSelectionStore={widgetStore.profileSelectionStore}/>
                <ButtonGroup className="shortcut-buttons">
                    <Tooltip content="Smoothing">
                        <AnchorButton icon={<CustomIcon icon="smoothing"/>} onClick={this.smoothingShortcutClick}/>
                    </Tooltip>
                    <Tooltip content="Moments">
                        <AnchorButton icon={<CustomIcon icon="moments"/>} onClick={this.momentsShortcutClick}/>
                    </Tooltip>
                </ButtonGroup>
            </div>
        );
    }
}
