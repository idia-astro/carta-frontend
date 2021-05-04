import * as React from "react";
import {observable, action, autorun, makeObservable} from "mobx";
import {observer} from "mobx-react";
import {AnchorButton, FormGroup, HTMLSelect, Slider, Pre, Text, Intent, Tooltip, Switch, Popover, Button} from "@blueprintjs/core";
import {SafeNumericInput} from "components/Shared";
import {ProfileFittingStore} from "stores/ProfileFittingStore"
import {SpectralProfileWidgetStore} from "stores/widgets";
import {AppStore} from "stores";
import {getTimestamp} from "utilities";
import "./ProfileFittingComponent.scss";

export enum FittingFunction {
    GAUSSIAN = 0,
    LORENTZIAN = 1
}

export enum FittingContinuum {
    NONE = -1,
    ZEROTH_ORDER = 0,
    FIRST_ORDER = 1
}

export interface ProfileFittingComponentProps {
    fittingStore: ProfileFittingStore,
    widgetStore: SpectralProfileWidgetStore
}

@observer
export class ProfileFittingComponent extends React.Component<ProfileFittingComponentProps> {
    @observable isShowingLog: boolean;
    @observable isShowingResultButton: boolean;

    private onFunctionChanged = (ev) => {
        this.reset();
        this.props.fittingStore.setFunction(parseInt(ev.target.value));
    }

    private onContinuumValueChanged = (ev) => {
        this.props.fittingStore.setYIntercept(0);
        this.props.fittingStore.setSlope(0);
        this.props.fittingStore.setContinuum(parseInt(ev.target.value));
    }

    private onYInterceptValueChanged = (val: number) => {
        this.props.fittingStore.setYIntercept(val);
    }

    private onSlopeValueChanged = (val: number) => {
        this.props.fittingStore.setSlope(val);
    }

    private onYInterceptValueLocked = () => {
        this.props.fittingStore.setLockedYIntercept(!this.props.fittingStore.lockedYIntercept);
    }

    private onSlopeValueLocked = () => {
        this.props.fittingStore.setLockedSlope(!this.props.fittingStore.lockedSlope);
    }

    private cursorSelectingYIntercept = () => {
        this.props.fittingStore.setIsCursorSelectingYIntercept(!this.props.fittingStore.isCursorSelectingYIntercept);
    }

    private cursorSelectingSlope = () => {
        this.props.fittingStore.setIsCursorSelectingSlope(!this.props.fittingStore.isCursorSelectingSlope);
    }

    private onCenterValueChanged = (val: number) => {
        this.props.fittingStore.selectedComponent.setCenter(val);
    }

    private onAmpValueChanged = (val: number) => {
        this.props.fittingStore.selectedComponent.setAmp(val);
    }

    private onFwhmValueChanged = (val: number) => {
        this.props.fittingStore.selectedComponent.setFwhm(val);
    }

    private onMouseOverResult = () => {
        this.setIsShowingResultButton(true);
    }

    private onMouseLeaveResult = () => {
        this.setIsShowingResultButton(false);
    }

    private autoDetect = () => {
        this.props.fittingStore.setHasResult(false);
        this.props.fittingStore.setComponents(1, true);
        if (this.props.widgetStore?.plotData?.fittingData) {
            // const fittingData = this.props.widgetStore.plotData.fittingData;
            // if (this.props.widgetStore.smoothingStore.type !== SmoothingType.NONE) {
            //     const smoothingData = this.props.widgetStore.smoothingStore.getSmoothingValues(fittingData.rawX, fittingData.rawY);
            //     this.props.fittingStore.autoDetect(smoothingData.x, Array.prototype.slice.call(smoothingData.y));
            // } else {
                this.props.fittingStore.autoDetect();
            // }
            if (this.props.fittingStore.isAutoDetectWithFitting) {
                this.fitData();
            }
        }
        this.props.fittingStore.setHasAutoDetectResult(true);
    }

    private deleteComponent = () => {
        this.props.fittingStore.deleteSelectedComponent();
    }

    private cursorSelecting = () => {
        this.props.fittingStore.setIsCursorSelectionOn(!this.props.fittingStore.isCursorSelectionOn);
    }

    private onCenterLocked = () => {
        this.props.fittingStore.selectedComponent.setLockedCenter(!this.props.fittingStore.selectedComponent.lockedCenter);
    }

    private onAmpLocked = () => {
        this.props.fittingStore.selectedComponent.setLockedAmp(!this.props.fittingStore.selectedComponent.lockedAmp);
    }

    private onFwhmLocked = () => {
        this.props.fittingStore.selectedComponent.setLockedFwhm(!this.props.fittingStore.selectedComponent.lockedFwhm);
    }

    private showLog = () => {
        this.setIsShowingLog(true);
    }

    private handleLogClose = () => {
        this.setIsShowingLog(false);
    }

    private saveLog = () => {
        let headerString = "";
        const frame = this.props.widgetStore.effectiveFrame;
        if (frame && frame.frameInfo && frame.regionSet) {
            headerString += `# image: ${frame.filename}\n`;

            const regionId = this.props.widgetStore.effectiveRegionId;
            const region = frame.regionSet.regions.find(r => r.regionId === regionId);

            // statistic type, ignore when region == cursor
            if (regionId !== 0) {
                headerString += `# statistic: ${this.props.widgetStore.profileSelectionStore.selectedStatsTypes[0]}\n`;
            }
            // region info
            if (region) {
                headerString += `# ${region.regionProperties}\n`;
                if (frame.validWcs) {
                    headerString += `# ${frame.getRegionWcsProperties(region)}\n`;
                }
            }
        }

        const content = `data:text/plain;charset=utf-8,${headerString}\n${this.props.fittingStore.resultLog}\n`;
        const dataURL = encodeURI(content).replace(/#/g, "%23");

        const a = document.createElement("a") as HTMLAnchorElement;
        a.href = dataURL;

        a.download = `Profile Fitting Result Log-${getTimestamp()}.txt`;
        a.dispatchEvent(new MouseEvent("click"));
    }

    private reset = () => {
        const fittingStore = this.props.fittingStore;
        fittingStore.setComponents(1,true);
        fittingStore.setHasResult(false);
        fittingStore.setContinuum(FittingContinuum.NONE);
        fittingStore.setYIntercept(0);
        fittingStore.setSlope(0);
        fittingStore.setResultYIntercept(0);
        fittingStore.setResultSlope(0);
        fittingStore.setIsCursorSelectingYIntercept(false);
        fittingStore.setIsCursorSelectingSlope(false);
        fittingStore.setIsCursorSelectionOn(false);
        fittingStore.setHasAutoDetectResult(false);
    }

    private fitData = () => {
        if (this.props.fittingStore.readyToFit) {
            this.props.fittingStore.fitData();
        }
    }

    autoButtonTooltip = () => {
        return(
            <span><i>
                Automatically detect features in the spectrum <br/>
                and set initial guess for each component.<br/>
                [Experimental]
            </i></span>
        )
    }
    @action setIsShowingLog(val: boolean) {
        this.isShowingLog = val;
    }

    @action setIsShowingResultButton(val: boolean) {
        this.isShowingResultButton = val;
    }

    constructor(props: ProfileFittingComponentProps) {
        super(props);
        makeObservable(this);
        autorun(() => {
            // clear fitting data when the profile data changed
            if (this.props.widgetStore?.profileSelectionStore?.profiles[0]) {
                this.reset();
            }

            if (this.props.widgetStore?.smoothingStore?.type) {
                this.reset();
            }
        });
    }

    render() {
        const appStore = AppStore.Instance;
        const fittingStore = this.props.fittingStore;

        return (
            <div className="profile-fitting-panel">
                <div className="profile-fitting-form">
                    <FormGroup label="Data source" inline={true}>
                        <HTMLSelect 
                            value={appStore.activeFrameIndex}
                            options={appStore.frames.map(frame => {return {label: frame.filename, value: frame.frameInfo.fileId};})} 
                            onChange={(ev) => appStore.setActiveFrame(parseInt(ev.target.value))}
                        />
                    </FormGroup>
                    <FormGroup label="Profile function" inline={true}>
                        <HTMLSelect 
                            value={fittingStore.function} 
                            options={[{label:"Gaussian", value: FittingFunction.GAUSSIAN}, {label:"Lorentzian", value: FittingFunction.LORENTZIAN}]} 
                            onChange={this.onFunctionChanged}
                        />
                    </FormGroup>
                    <FormGroup label="Auto detect" inline={true}>
                        <div className={"component-input"}>
                            <Tooltip content={this.autoButtonTooltip()}>
                                <AnchorButton onClick={this.autoDetect} icon="series-search"/>
                            </Tooltip>
                            <Switch
                                label="w/ cont."
                                checked={fittingStore.isAutoDetectWithCont}
                                onChange={(ev) => fittingStore.setIsAutoDetectWithCont(!fittingStore.isAutoDetectWithCont)}
                            />
                            <Switch
                                label="auto fit"
                                checked={fittingStore.isAutoDetectWithFitting}
                                onChange={(ev) => fittingStore.setIsAutoDetectWithFitting(!fittingStore.isAutoDetectWithFitting)}
                            />
                        </div>
                    </FormGroup>
                    {fittingStore.hasAutoDetectResult &&
                        <FormGroup label=" " inline={true}>
                            <div>{fittingStore.autoDetectResultText}</div>
                        </FormGroup>
                    }
                    <FormGroup label="Components" inline={true}>
                        <div className={"components-input"}>
                            <SafeNumericInput
                                value={fittingStore.components.length}
                                min={1}
                                max={20}
                                stepSize={1}
                                onValueChange={val => fittingStore.setComponents(Math.round(val))}
                            />
                            {fittingStore.components.length > 1 &&
                                <div className="components-slieder">
                                    <Slider
                                        value={fittingStore.selectedIndex + 1}
                                        min={1}
                                        stepSize={1}
                                        max={fittingStore.components.length}
                                        showTrackFill={false}
                                        onChange={val => fittingStore.setSelectedIndex(val - 1)}
                                        disabled={fittingStore.components.length <= 1}
                                    />
                                    <AnchorButton intent={Intent.NONE} icon={"trash"} onClick={this.deleteComponent}/>
                                </div>
                            }
                        </div>
                    </FormGroup>
                    <FormGroup label="Center" inline={true}>
                        <div className="component-input">
                            <SafeNumericInput
                                value={fittingStore.selectedComponent.center}
                                onValueChange={this.onCenterValueChanged}
                                disabled={fittingStore.selectedComponent.lockedCenter}
                                allowNumericCharactersOnly={false}
                                buttonPosition="none"
                            />
                            <AnchorButton onClick={this.onCenterLocked} icon={fittingStore.selectedComponent.lockedCenter ? "lock" : "unlock"}/>
                            <AnchorButton onClick={this.cursorSelecting} active={fittingStore.isCursorSelectionOn} icon="select"/>
                        </div>
                    </FormGroup>
                    <FormGroup label="Amplitude" inline={true}>
                        <div className="component-input">
                            <SafeNumericInput
                                value={fittingStore.selectedComponent.amp}
                                onValueChange={this.onAmpValueChanged}
                                disabled={fittingStore.selectedComponent.lockedAmp}
                                allowNumericCharactersOnly={false}
                                buttonPosition="none"
                                />
                            <AnchorButton onClick={this.onAmpLocked} icon={fittingStore.selectedComponent.lockedAmp ? "lock" : "unlock"}/>
                            <AnchorButton onClick={this.cursorSelecting} active={fittingStore.isCursorSelectionOn} icon="select"/>
                        </div>
                    </FormGroup>
                    <FormGroup label="FWHM" inline={true}>
                        <div className="component-input">
                            <SafeNumericInput
                                value={fittingStore.selectedComponent.fwhm}
                                onValueChange={this.onFwhmValueChanged}
                                disabled={fittingStore.selectedComponent.lockedFwhm}
                                allowNumericCharactersOnly={false}
                                buttonPosition="none"
                            />
                            <AnchorButton onClick={this.onFwhmLocked} icon={fittingStore.selectedComponent.lockedFwhm ? "lock" : "unlock"}/>
                            <AnchorButton onClick={this.cursorSelecting} active={fittingStore.isCursorSelectionOn} icon="select"/>
                        </div>
                    </FormGroup>
                    <FormGroup label="Continuum" inline={true}>
                    <div className="component-input">
                        <HTMLSelect 
                            value={fittingStore.continuum} 
                            options={[{label:"None", value: FittingContinuum.NONE}, {label:"0th order", value: FittingContinuum.ZEROTH_ORDER}, {label:"1st order", value: FittingContinuum.FIRST_ORDER}]} 
                            onChange={this.onContinuumValueChanged}
                        />
                    </div>
                    </FormGroup>
                    {(fittingStore.continuum === FittingContinuum.ZEROTH_ORDER || fittingStore.continuum === FittingContinuum.FIRST_ORDER) &&
                        <FormGroup label="Y intercept" inline={true}>
                            <div className="component-input">
                                <SafeNumericInput
                                    value={fittingStore.yIntercept}
                                    onValueChange={this.onYInterceptValueChanged}
                                    disabled={fittingStore.lockedYIntercept}
                                    allowNumericCharactersOnly={false}
                                    buttonPosition="none"
                                    />
                                <AnchorButton onClick={this.onYInterceptValueLocked} icon={fittingStore.lockedYIntercept ? "lock" : "unlock"}/>
                                {fittingStore.continuum === FittingContinuum.ZEROTH_ORDER &&
                                    <AnchorButton onClick={this.cursorSelectingYIntercept} active={fittingStore.isCursorSelectingYIntercept} icon="select"/>
                                }
                                {fittingStore.continuum === FittingContinuum.FIRST_ORDER &&
                                    <AnchorButton onClick={this.cursorSelectingSlope} active={fittingStore.isCursorSelectingSlope} icon="select"/>
                                }
                            </div>
                        </FormGroup>
                    }
                    {fittingStore.continuum === FittingContinuum.FIRST_ORDER &&
                        <FormGroup label="Slope" inline={true}>
                            <div className="component-input">
                                <SafeNumericInput
                                    value={fittingStore.slope}
                                    onValueChange={this.onSlopeValueChanged}
                                    disabled={fittingStore.lockedSlope}
                                    allowNumericCharactersOnly={false}
                                    buttonPosition="none"
                                    />
                                <AnchorButton onClick={this.onSlopeValueLocked} icon={fittingStore.lockedSlope ? "lock" : "unlock"}/>
                                <AnchorButton onClick={this.cursorSelectingSlope} active={fittingStore.isCursorSelectingSlope} icon="select"/>
                            </div>
                        </FormGroup>
                    }
                    <FormGroup label="Fitting result" inline={true}>
                        <div onMouseOver={this.onMouseOverResult} onMouseLeave={this.onMouseLeaveResult}>
                            <div className="fitting-result">
                                <Pre className="fitting-result-pre">
                                    <Text>
                                        {fittingStore.resultString}
                                    </Text>
                                </Pre>
                            </div>
                            {this.isShowingResultButton ? <Button icon="import" onClick={this.saveLog} className="fitting-result-hover-button"/> : <div style={{height: "30px"}}/>}
                        </div>
                    </FormGroup>
                </div>
                <div className="profile-fitting-footer">
                    <AnchorButton 
                        text="Reset"
                        intent={Intent.PRIMARY}
                        onClick={this.reset}
                    />
                    <AnchorButton
                        text="Fit"
                        intent={Intent.PRIMARY}
                        onClick={this.fitData}
                        disabled={!fittingStore.readyToFit}
                    />
                    <Popover isOpen={this.isShowingLog} onClose={this.handleLogClose}> 
                        <AnchorButton
                            text="View log"
                            onClick={this.showLog}
                            intent={Intent.PRIMARY}
                            disabled={!fittingStore.hasResult}
                        />
                        <div className="fitting-popover">
                            <div className="fitting-log">
                                <Pre className="fitting-log-pre">
                                    <Text>
                                        {fittingStore.resultLog}
                                    </Text>
                                </Pre>
                            </div>
                            <div className="fitting-popover-footer">
                                <Button
                                    text="Save log"
                                    onClick={this.saveLog}
                                    className="fitting-log-button"
                                />
                            </div>
                        </div>
                    </Popover>
                    <div className="switch-wrapper">
                        <Switch
                            label="residual"
                            checked={fittingStore.enableResidual}
                            onChange={(ev) => fittingStore.setEnableResidual(ev.currentTarget.checked)}
                            />
                    </div>
                </div>
            </div>
        );
    }
}
