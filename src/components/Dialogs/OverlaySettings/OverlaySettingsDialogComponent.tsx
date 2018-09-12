import * as React from "react";
import {AppStore} from "../../../stores/AppStore";
import {LabelType, SystemType} from "../../../stores/OverlayStore";
import {observer} from "mobx-react";
import "./OverlaySettingsDialogComponent.css";
import {Button, Switch, Dialog, IDialogProps, Intent, Tab, Tabs, NumericInput, FormGroup, MenuItem, HTMLSelect} from "@blueprintjs/core";
import {Select, ItemRenderer} from "@blueprintjs/select";
import * as AST from "ast_wrapper";
import {DraggableDialogComponent} from "../DraggableDialog/DraggableDialogComponent";

// Color selector
export class Color {
    name: string;
    id: number;
    
    constructor(name: string, id: number) {
        this.name = name;
        this.id = id;
    }
}

const astColors: Color[] = AST.colors.map((x, i) => ({name: x, id: i}));

const ColorSelect = Select.ofType<Color>();

export const renderColor: ItemRenderer<Color> = (color, { handleClick, modifiers, query }) => {
    return (
        <MenuItem
            active={modifiers.active}
            disabled={modifiers.disabled}
            key={color.id}
            onClick={handleClick}
            text={(<div style={{background: color.name, border: "solid 1px black", width: "100%"}}>&nbsp;</div>)}
        />
    );
};

// Font selector

export class Font {
    name: string;
    id: number;
    style: string;
    weight: number;
    family: string;
    
    constructor(name: string, id: number) {
        this.name = name.replace("{size} ", "");
        this.id = id;
        
        var family = this.name;
        
        if (family.indexOf("bold") === 0) {
            family = family.replace("bold ", "");
            this.weight = 700;
        } else {
            this.weight = 400;
        }
        
        if (family.indexOf("italic") === 0) {
            family = family.replace("italic ", "");
            this.style = "italic";
        } else {
            this.style = "";
        }
        
        this.family = family;
    }
}

const astFonts: Font[] = AST.fonts.map((x, i) => (new Font(x, i)));

const FontSelect = Select.ofType<Font>();

export const renderFont: ItemRenderer<Font> = (font, { handleClick, modifiers, query }) => {
    return (
        <MenuItem
            active={modifiers.active}
            disabled={modifiers.disabled}
            key={font.id}
            onClick={handleClick}
            text={(<span style={{fontFamily: font.family, fontWeight: font.weight, fontStyle: font.style}}>{font.name}</span>)}
        />
    );
};

@observer
export class OverlaySettingsDialogComponent extends React.Component<{ appStore: AppStore }> {

    private colorSelect(visible: boolean, currentColorId: number, colorSetter: Function) {
        var currentColor: Color = astColors[currentColorId];
        if (typeof currentColor === "undefined") {
            currentColor = astColors[0];
        }
        
        return (
            <ColorSelect
                activeItem={currentColor}
                itemRenderer={renderColor}
                items={astColors}
                disabled={!visible}
                filterable={false}
                popoverProps={{minimal: true, position: "auto-end", popoverClassName: "colorselect"}}
                onItemSelect={(color) => colorSetter(color.id)}
            >
                <Button text={(<div style={{background: currentColor.name, border: "solid 1px black", width: "100px"}}>&nbsp;</div>)} disabled={!visible} rightIcon="double-caret-vertical" />
            </ColorSelect>
        );
    }

    private fontSelect(visible: boolean, currentFontId: number, fontSetter: Function) {
        var currentFont: Font = astFonts[currentFontId];
        if (typeof currentFont === "undefined") {
            currentFont = astFonts[0];
        }
        
        return (
            <FontSelect
                activeItem={currentFont}
                itemRenderer={renderFont}
                items={astFonts}
                disabled={!visible}
                filterable={false}
                popoverProps={{minimal: true, position: "auto-end"}}
                onItemSelect={(font) => fontSetter(font.id)}
            >
                <Button text={(<span style={{fontFamily: currentFont.family, fontWeight: currentFont.weight, fontStyle: currentFont.style}}>{currentFont.name}</span>)} disabled={!visible} rightIcon="double-caret-vertical" />
            </FontSelect>
        );
    }
    
    private axisTabGroup(id: number) {
        const overlayStore = this.props.appStore.overlayStore;
        
        var tabId;
        var tabTitle;
        var axis;
        var perAxisComponent;
        
        if (id === 0) {
            tabId = "axes";
            tabTitle = "Axes";
            axis = overlayStore.axes;
        } else {
            tabId = `axis${id}`;
            tabTitle = `Axis ${id}`;
            axis = overlayStore.axis[id - 1];
        }
        
        const tabGroupSelected = (
            overlayStore.overlaySettingsActiveTab === tabId || 
            overlayStore.overlaySettingsActiveTab === `${tabId}Numbers` ||
            overlayStore.overlaySettingsActiveTab === `${tabId}Labels`
        );
                
        const axisPanel = (
            <div className="panel-container">
                <Switch
                    checked={axis.visible}
                    label="Visible"
                    onChange={(ev) => axis.setVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Color" disabled={!axis.visible}>
                    {this.colorSelect(axis.visible, axis.color, axis.setColor)}
                </FormGroup>
                <FormGroup label="Width" disabled={!axis.visible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Width"
                        min={0.001}
                        value={axis.width}
                        disabled={!axis.visible}
                        onValueChange={(value: number) => axis.setWidth(value)}
                    />
                </FormGroup>
                <FormGroup label="Gap" disabled={!axis.visible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Gap"
                        min={0.001}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        value={axis.gap}
                        disabled={!axis.visible}
                        onValueChange={(value: number) => axis.setGap(value)}
                    />
                </FormGroup>
                { id === 0 ?
                    [<Switch
                        key="axis1custom"
                        checked={overlayStore.axis[0].customConfig}
                        label="Use custom configuration for axis 1"
                        onChange={(ev) => overlayStore.axis[0].setCustomConfig(ev.currentTarget.checked)}
                    />,
                    <Switch
                        key="axis2custom"
                        checked={overlayStore.axis[1].customConfig}
                        label="Use custom configuration for axis 2"
                        onChange={(ev) => overlayStore.axis[1].setCustomConfig(ev.currentTarget.checked)}
                    />]
                :
                    <Button onClick={(ev) => { axis.setCustomConfig(false); overlayStore.setOverlaySettingsActiveTab("axes"); }} text="Use default axis settings"/>
                }
            </div>
        );
        
        const axisNumbersPanel = (
            <div className="panel-container">
                <Switch
                    checked={axis.numberVisible}
                    label="Visible"
                    onChange={(ev) => axis.setNumberVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Font" disabled={!axis.numberVisible}>
                    {this.fontSelect(axis.numberVisible, axis.numberFont, axis.setNumberFont)}
                    <NumericInput
                        style={{width: "110px"}}
                        min={7}
                        placeholder="Font size"
                        value={axis.numberFontSize}
                        disabled={!axis.numberVisible}
                        onValueChange={(value: number) => axis.setNumberFontSize(value)}
                    />
                </FormGroup>
                <FormGroup label="Color" disabled={!axis.numberVisible}>
                    {this.colorSelect(axis.numberVisible, axis.numberColor, axis.setNumberColor)}
                </FormGroup>
                <FormGroup label="Format" disabled={!axis.numberVisible}>
                    <input
                        className="bp3-input"
                        type="text"
                        placeholder="Format"
                        value={axis.numberFormat}
                        disabled={!axis.numberVisible}
                        onChange={(ev) => axis.setNumberFormat(ev.currentTarget.value)}
                    />
                </FormGroup>
            </div>
        );
        
        const axisLabelsPanel = (
            <div className="panel-container">
                <Switch
                    checked={axis.labelVisible}
                    label="Visible"
                    onChange={(ev) => axis.setLabelVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Text" disabled={!axis.labelVisible}>
                    <input
                        className="bp3-input"
                        type="text"
                        placeholder="Text input"
                        value={axis.labelText}
                        disabled={!axis.labelVisible}
                        onChange={(ev) => axis.setLabelText(ev.currentTarget.value)}
                    />
                </FormGroup>
                <FormGroup label="Font" disabled={!axis.labelVisible}>
                    {this.fontSelect(axis.labelVisible, axis.labelFont, axis.setLabelFont)}
                    <NumericInput
                        style={{width: "110px"}}
                        min={7}
                        placeholder="Font size"
                        value={axis.labelFontSize}
                        disabled={!axis.labelVisible}
                        onValueChange={(value: number) => axis.setLabelFontSize(value)}
                    />
                </FormGroup>
                <FormGroup label="Gap" disabled={!axis.labelVisible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Gap"
                        min={0}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        value={axis.labelGap}
                        disabled={!axis.labelVisible}
                        onValueChange={(value: number) => axis.setLabelGap(value)}
                    />
                </FormGroup>
                <FormGroup label="Color" disabled={!axis.labelVisible}>
                    {this.colorSelect(axis.labelVisible, axis.labelColor, axis.setLabelColor)}
                </FormGroup>
            </div>
        );
        
        var axisTabs = [
            <Tab key={tabId} id={tabId} title={tabTitle} panel={axisPanel}/>
        ];
        
        if (tabGroupSelected) {
            axisTabs.push(<Tab key={`${tabId}Numbers`} id={`${tabId}Numbers`} title="&#8227; Numbers" disabled={!axis.visible} panel={axisNumbersPanel}/>);
            axisTabs.push(<Tab key={`${tabId}Labels`} id={`${tabId}Labels`} title="&#8227; Labels" disabled={!axis.visible} panel={axisLabelsPanel}/>);
        }
    
        return axisTabs;
    }

    public render() {
        const overlayStore = this.props.appStore.overlayStore;
        const title = overlayStore.title;
        const grid = overlayStore.grid;
        const border = overlayStore.border;
        const ticks = overlayStore.ticks;
        const axes = overlayStore.axes;
        const axis = overlayStore.axis;
        
        const globalPanel = (
            <div className="panel-container">
                <FormGroup label="Font">
                    {this.fontSelect(true, overlayStore.font, overlayStore.setFont)}
                    <NumericInput
                        style={{width: "110px"}}
                        min={7}
                        placeholder="Font size"
                        value={overlayStore.fontSize}
                        onValueChange={(value: number) => overlayStore.setFontSize(value)}
                    />
                </FormGroup>
                <FormGroup label="Color">
                    {this.colorSelect(true, overlayStore.color, overlayStore.setColor)}
                </FormGroup>
                <FormGroup label="Width">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Width"
                        min={0.001}
                        value={overlayStore.width}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={1}
                        onValueChange={(value: number) => overlayStore.setWidth(value)}
                    />
                </FormGroup>
                <FormGroup label="Tolerance">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Tolerance"
                        min={0}
                        value={overlayStore.tolerance}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        onValueChange={(value: number) => overlayStore.setTolerance(value)}
                    />
                </FormGroup>
                <FormGroup label="Labelling">
                    <HTMLSelect
                        options={Object.keys(LabelType).map((key) => ({label: key, value: LabelType[key]}))}
                        value={overlayStore.labelType}
                        onChange={(event: React.FormEvent<HTMLSelectElement>) => overlayStore.setLabelType(event.currentTarget.value as LabelType)}
                    />
                </FormGroup>
                <FormGroup label="Coordinate system">
                    <HTMLSelect
                        options={Object.keys(SystemType).map((key) => ({label: key, value: SystemType[key]}))}
                        value={overlayStore.system}
                        onChange={(event: React.FormEvent<HTMLSelectElement>) => overlayStore.setSystem(event.currentTarget.value as SystemType)}
                    />
                </FormGroup>
            </div>
        );
        
        const titlePanel = (
            <div className="panel-container">
                <Switch 
                    checked={title.visible}
                    label="Visible"
                    onChange={(ev) => title.setVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Text" disabled={!title.visible}>
                    <input
                        className="bp3-input"
                        type="text"
                        placeholder="Text input"
                        value={title.text}
                        disabled={!title.visible}
                        onChange={(ev) => title.setText(ev.currentTarget.value)}
                    />
                </FormGroup>
                <FormGroup label="Font" disabled={!title.visible}>
                    {this.fontSelect(title.visible, title.font, title.setFont)}
                    <NumericInput
                        style={{width: "110px"}}
                        min={7}
                        placeholder="Font size"
                        value={title.fontSize}
                        disabled={!title.visible}
                        onValueChange={(value: number) => title.setFontSize(value)}
                    />
                </FormGroup>
                <FormGroup label="Gap" disabled={!title.visible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Gap"
                        min={0}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        value={title.gap}
                        disabled={!title.visible}
                        onValueChange={(value: number) => title.setGap(value)}
                    />
                </FormGroup>
                <FormGroup label="Color" disabled={!title.visible}>
                    {this.colorSelect(title.visible, title.color, title.setColor)}
                </FormGroup>
            </div>
        );
        
        const ticksPanel = (
            <div className="panel-container">
                <FormGroup label="Density">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Density"
                        min={0}
                        value={ticks.density}
                        onValueChange={(value: number) => ticks.setDensity(value)}
                    />
                </FormGroup>
                <FormGroup label="Color">
                    {this.colorSelect(true, ticks.color, ticks.setColor)}
                </FormGroup>
                <FormGroup label="Width">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Width"
                        min={0.001}
                        value={ticks.width}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={1}
                        onValueChange={(value: number) => ticks.setWidth(value)}
                    />
                </FormGroup>
                <FormGroup label="Length">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Length"
                        min={0}
                        value={ticks.length}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        onValueChange={(value: number) => ticks.setLength(value)}
                    />
                </FormGroup>
                <FormGroup label="Major length">
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Major length"
                        min={0}
                        value={ticks.majorLength}
                        stepSize={0.01}
                        minorStepSize={0.001}
                        majorStepSize={0.1}
                        onValueChange={(value: number) => ticks.setMajorLength(value)}
                    />
                </FormGroup>
            </div>
        );
        
        const gridPanel = (
            <div className="panel-container">
                <Switch
                    checked={grid.visible}
                    label="Visible"
                    onChange={(ev) => grid.setVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Color" disabled={!grid.visible}>
                    {this.colorSelect(grid.visible, grid.color, grid.setColor)}
                </FormGroup>
                <FormGroup label="Width" disabled={!grid.visible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Width"
                        min={0.001}
                        value={grid.width}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={1}
                        disabled={!grid.visible}
                        onValueChange={(value: number) => grid.setWidth(value)}
                    />
                </FormGroup>
            </div>
        );
        
        const borderPanel = (
            <div className="panel-container">
                <Switch
                    checked={border.visible}
                    label="Visible"
                    onChange={(ev) => border.setVisible(ev.currentTarget.checked)}
                />
                <FormGroup label="Color" disabled={!border.visible}>
                    {this.colorSelect(border.visible, border.color, border.setColor)}
                </FormGroup>
                <FormGroup label="Width" disabled={!border.visible}>
                    <NumericInput
                        style={{width: "110px"}}
                        placeholder="Width"
                        min={0.001}
                        value={border.width}
                        stepSize={0.1}
                        minorStepSize={0.01}
                        majorStepSize={1}
                        disabled={!border.visible}
                        onValueChange={(value: number) => border.setWidth(value)}
                    />
                </FormGroup>
            </div>
        );

        let className = "overlay-settings-dialog";
        if (this.props.appStore.darkTheme) {
            className += " bp3-dark";
        }

        const dialogProps: IDialogProps = {
            icon: "settings",
            backdropClassName: "minimal-dialog-backdrop",
            className: className,
            canOutsideClickClose: false,
            lazy: true,
            isOpen: overlayStore.overlaySettingsDialogVisible,
            onClose: overlayStore.hideOverlaySettings,
            title: "Overlay Settings",
        };

        return (
            <DraggableDialogComponent dialogProps={dialogProps} minWidth={300} minHeight={300} defaultWidth={600} defaultHeight={450} enableResizing={true}>
                <div className="bp3-dialog-body">
                    <Tabs
                        id="overlayTabs"
                        vertical={true}
                        selectedTabId={overlayStore.overlaySettingsActiveTab}
                        onChange={(tabId) => overlayStore.setOverlaySettingsActiveTab(String(tabId))}
                    >
                        <Tab id="global" title="Global" panel={globalPanel}/>
                        <Tab id="title" title="Title" panel={titlePanel}/>
                        <Tab id="ticks" title="Ticks" panel={ticksPanel}/>
                        <Tab id="grid" title="Grid" panel={gridPanel}/>
                        <Tab id="border" title="Border" panel={borderPanel}/>
                        {this.axisTabGroup(0)}
                        {overlayStore.axis[0].customConfig && this.axisTabGroup(1)}
                        {overlayStore.axis[1].customConfig && this.axisTabGroup(2)}
                    </Tabs>
                </div>
                <div className="bp3-dialog-footer">
                    <div className="bp3-dialog-footer-actions">
                        <Button intent={Intent.PRIMARY} onClick={overlayStore.hideOverlaySettings} text="Close"/>
                    </div>
                </div>
            </DraggableDialogComponent>
        );
    }
}
