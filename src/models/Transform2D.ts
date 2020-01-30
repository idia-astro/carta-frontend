import {Point2D} from "./Point2D";

export interface Transform2D {
    translation: Point2D;
    rotation: number;
    scale: number;
    origin: Point2D;
}