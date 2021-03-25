import {observer} from "mobx-react";
import * as React from "react";
import {CARTA} from "carta-protobuf";
import {AnchorButton, ButtonGroup, IOptionProps, Menu, MenuItem, Popover, Position, Tooltip} from "@blueprintjs/core";
import {AppStore} from "stores";
import {ProfileCategory, SpectralProfileSelectionStore, SpectralProfileWidgetStore} from "stores/widgets";
import {SpectralProfilerComponent, SpectralProfilerSettingsTabs} from "components";
import {CustomIcon} from "icons/CustomIcons";
import "./SpectralProfilerToolbarComponent.scss";

export interface ProfileItemOptionProps extends IOptionProps{
    disable?: boolean;
    hightlight?: boolean;
}

type MultiSelectItem = string | CARTA.StatsType;

@observer
class ProfileSelectionComponent extends React.Component<{profileSelectionStore: SpectralProfileSelectionStore}> {
    private onFrameItemClick = (selectedFrame: number) => {
        this.props.profileSelectionStore.selectFrame(selectedFrame);
    };

    private onRegionItemClick = (selectedRegionId: number) => {
        this.props.profileSelectionStore.selectRegion(selectedRegionId);
    };

    private onStatsItemClick = (selectedStatsType: CARTA.StatsType) => {
        this.props.profileSelectionStore.selectStatsType(selectedStatsType);
    };

    private onStokesItemClick = (selectedStokes: string) => {
        this.props.profileSelectionStore.selectCoordinate(selectedStokes);
    };

    public render() {
        const profileSelectionStore = this.props.profileSelectionStore;

        const enableFrameSelect = true;
        const enableRegionSelect = true;
        const enableStatsSelect = true; // TODO: check isClosedRegion
        const enableStokesSelect = profileSelectionStore.selectedFrame?.hasStokes;

        let enableSelectionMenu = true;
        let itemOptions: ProfileItemOptionProps[];
        let itemSelected: MultiSelectItem[];
        let onItemClick: (item: MultiSelectItem) => void;
        if (profileSelectionStore.profileCategory === ProfileCategory.IMAGE) {
            itemOptions = profileSelectionStore.frameOptions;
            itemSelected = [profileSelectionStore.selectedFrameFileId];
            onItemClick = this.onFrameItemClick;
            enableSelectionMenu = enableSelectionMenu && enableFrameSelect;
        } else if (profileSelectionStore.profileCategory === ProfileCategory.REGION) {
            itemOptions = profileSelectionStore.regionOptions;
            itemSelected = profileSelectionStore.selectedRegionIds;
            onItemClick = this.onRegionItemClick;
            enableSelectionMenu = enableSelectionMenu && enableRegionSelect;
        } else if (profileSelectionStore.profileCategory === ProfileCategory.STATISTICS) {
            itemOptions = profileSelectionStore.statsTypeOptions;
            itemSelected = profileSelectionStore.selectedStatsTypes;
            onItemClick = this.onStatsItemClick;
            enableSelectionMenu = enableSelectionMenu && enableStatsSelect;
        } else {
            itemOptions = profileSelectionStore.coordinateOptions;
            itemSelected = profileSelectionStore.selectedCoordinates;
            onItemClick = this.onStokesItemClick;
            enableSelectionMenu = enableSelectionMenu && enableStokesSelect;
        }

        return (
            <div className="profile-selection-panel">
                <ButtonGroup className="category-buttons">
                    <Tooltip content={`Click to show profiles - ${ProfileCategory.IMAGE}`} position={Position.TOP}>
                        <AnchorButton
                            text={ProfileCategory.IMAGE}
                            active={profileSelectionStore.profileCategory === ProfileCategory.IMAGE}
                            onClick={(ev) => profileSelectionStore.setProfileCategory(ProfileCategory.IMAGE)}
                            disabled={!enableFrameSelect}
                        />
                    </Tooltip>
                    <Tooltip content={`Click to show profiles - ${ProfileCategory.REGION}`} position={Position.TOP}>
                        <AnchorButton
                            text={ProfileCategory.REGION}
                            active={profileSelectionStore.profileCategory === ProfileCategory.REGION}
                            onClick={(ev) => profileSelectionStore.setProfileCategory(ProfileCategory.REGION)}
                            disabled={!enableRegionSelect}
                        />
                    </Tooltip>
                    <Tooltip content={`Click to show profiles - ${ProfileCategory.STATISTICS}`} position={Position.TOP}>
                        <AnchorButton
                            text={ProfileCategory.STATISTICS}
                            active={profileSelectionStore.profileCategory === ProfileCategory.STATISTICS}
                            onClick={(ev) => profileSelectionStore.setProfileCategory(ProfileCategory.STATISTICS)}
                            disabled={!enableStatsSelect}
                        />
                    </Tooltip>
                    <Tooltip content={`Click to show profiles - ${ProfileCategory.STOKES}`} position={Position.TOP}>
                        <AnchorButton
                            text={ProfileCategory.STOKES}
                            active={profileSelectionStore.profileCategory === ProfileCategory.STOKES}
                            onClick={(ev) => profileSelectionStore.setProfileCategory(ProfileCategory.STOKES)}
                            disabled={!enableStokesSelect}
                        />
                    </Tooltip>
                </ButtonGroup>
                <Popover
                    content={
                        <Menu>
                            {itemOptions?.map((item) =>
                                <MenuItem
                                    key={item.value}
                                    text={item.label}
                                    disabled={item.disable}
                                    onClick={(ev) => onItemClick(item.value)}
                                    icon={itemSelected?.includes(item.value) ? "tick" : "blank"}
                                    shouldDismissPopover={false}
                                />
                            )}
                        </Menu>
                    }
                    minimal={true}
                    placement={Position.BOTTOM}
                    disabled={!enableSelectionMenu}
                >
                    <AnchorButton text={`Select ${profileSelectionStore.profileCategory}`} rightIcon={"caret-down"} disabled={!enableSelectionMenu}/>
                </Popover>
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
        return (
            <div className="spectral-profiler-toolbar">
                <ProfileSelectionComponent profileSelectionStore={this.props.widgetStore.profileSelectionStore}/>
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
