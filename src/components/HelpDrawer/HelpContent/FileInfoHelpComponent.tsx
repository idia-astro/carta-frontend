import * as React from "react";
import * as underConstruction from "static/help/under_construction.png";

export class FileInfoHelpComponent extends React.Component {
    public render() {
        return (
            <div>
                <p>File information dialogue provides a summary of the properties and full image header of the image in the current
        image viewer. To switch to other images, use the frame slider in the animator widget.</p>
            </div>
        );
    }
}
