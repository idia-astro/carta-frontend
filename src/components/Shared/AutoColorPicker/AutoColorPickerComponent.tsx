import * as React from "react";
import * as _ from "lodash";
import {computed} from "mobx";
import {observer} from "mobx-react";
import {makeObservable, observable} from "mobx";
import {SketchPicker, ColorResult} from "react-color";
import {Button, Popover, PopoverPosition, MenuItem} from "@blueprintjs/core";
import {Select} from "@blueprintjs/select";
import {getColorForTheme} from "utilities";
import "./AutoColorPickerComponent.scss";
import {AppStore} from "stores";

interface AutoColorPickerComponentProps {
    color: string;
    presetColors: string[];
    disableAlpha: boolean;
    disabled?: boolean;
    setColor: (color: string) => void;
}

const ColorSelect = Select.ofType<string>();

@observer
export class AutoColorPickerComponent extends React.Component<AutoColorPickerComponentProps> {

    private static readonly CHANGE_DELAY = 100;
    @observable displayColorPicker: boolean;

    @computed get autoColor(): string {
        return getColorForTheme(this.props.color);
    }

    private handleColorChange = _.throttle((newColor: ColorResult) => {
        if (this.props.setColor) {
            this.props.setColor(newColor.hex);
        }
    }, AutoColorPickerComponent.CHANGE_DELAY);

    private renderColorBlock = (color: string) => {
        let className = "dropdown-color";
        return (
            <div className={className} style={{backgroundColor: color}}>&nbsp;</div>
        );
    };

    private renderColorSelectItem = (colorItem: string, {handleClick, modifiers}) => {
        if (colorItem === "custom-color") {
            let popoverClassName = "color-picker-popup";
            if (AppStore.Instance.darkTheme) {
                popoverClassName += " bp3-dark";
            }

            return (
                <div key={"custom-color"} className={"custom-color"}>
                    <Popover position={PopoverPosition.BOTTOM_RIGHT} popoverClassName={popoverClassName}>
                        <Button text={"Other"} className="color-swatch-button" disabled={this.props.disabled}/>
                        <SketchPicker color={this.autoColor} onChange={this.handleColorChange} disableAlpha={this.props.disableAlpha} presetColors={this.props.presetColors}/>
                    </Popover>
                </div>
            );
        } else {
            return (
                <MenuItem
                    active={modifiers.active}
                    disabled={modifiers.disabled}
                    key={colorItem}
                    onClick={handleClick}
                    text={this.renderColorBlock(getColorForTheme(colorItem))}
                />
            );
        }
    };

    constructor(props: AutoColorPickerComponentProps) {
        super(props);
        makeObservable(this);
    }

    public render() {
        const color = this.props.color;

        return (
            <ColorSelect
                activeItem={color}
                onItemSelect={(color) => this.props.setColor(color)}
                popoverProps={{minimal: true, position: PopoverPosition.BOTTOM_LEFT, popoverClassName: "colorselect"}}
                filterable={false}
                items={[
                    "auto-blue",
                    "auto-green",
                    "auto-orange",
                    "auto-red",
                    "auto-vermilion",
                    "auto-rose",
                    "auto-violet",
                    "auto-indigo",
                    "auto-cobalt",
                    "auto-turquoise",
                    "auto-forest",
                    "auto-lime",
                    "auto-gold",
                    "auto-sepia",
                    "auto-black",
                    "auto-dark_gray",
                    "auto-gray",
                    "auto-light_gray",
                    "auto-white",
                    "custom-color"
                ]}
                itemRenderer={this.renderColorSelectItem}
            >
                <Button className="colorselect" text={this.renderColorBlock(this.autoColor)} rightIcon="double-caret-vertical"/>
            </ColorSelect>
        );
    }
};