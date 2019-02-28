import {ChannelType} from "./ChannelType";

export interface ChannelInfo {
    fromWCS: boolean;
    channelType: ChannelType;
    indexes: number[];
    values: number[];
    rawValues: number[];
    getChannelIndexWCS: (x: number) => number;
    getChannelIndexSimple: (x: number) => number;
}