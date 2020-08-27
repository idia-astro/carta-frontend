import * as React from "react";
import {AppStore} from "stores";
import {ImageComponent} from "./ImageComponent";


export class ImageViewSettingsHelpComponent extends React.Component {
    public render() {
        return (
            <div>
                <p>The image view settings dialogue allows users to customize coordinate 
                    grid related properties in the image viewer.</p>
                <h3 id="global">Global</h3>
                <p>This section allows users to</p>
                <ul>
                    <li>set a global color theme for the grid overlay</li>
                    <li>configure grid line rendering accuracy</li>
                    <li>put coordinate labels inside or outside the image</li>
                    <li>select a coordinate reference frame to generate the grid overlay</li>
                </ul>
                <h3 id="title">Title</h3>
                <p>A custom title can be added in this section.</p>
                <h3 id="ticks">Ticks</h3>
                <p>This section allows users to changes the ticks properties.</p>
                <h3 id="grid">Grid</h3>
                <p>This section allows users to customize the appearance of coordinate grid lines.</p>
                <h3 id="border">Border</h3>
                <p>This section allows users to change the style of the axis border.</p>
                <h3 id="axes">Axes</h3>
                <p>This section allows users to adjust the appearance of an interior axis overlay.</p>
                <h3 id="numbers">Numbers</h3>
                <p>This sections allows users to customize the appearance of tick values.</p>
                <h3 id="labels">Labels</h3>
                <p>This section allows users to modify the style of x and y labels.</p>
                <h3 id="beam">Beam</h3>
                <p>This section allows users to change the appearance of a beam overlay and 
                    adjust its position in the image viewer.</p>
            </div>
        );
    }
}
