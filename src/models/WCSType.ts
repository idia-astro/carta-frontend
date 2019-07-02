export class WCSType {
    public static readonly AUTOMATIC = "automatic";
    public static readonly DEGREES = "degrees";
    public static readonly SEXIGESIMAL = "sexigesimal";

    public static isValid = (wcsType: string): boolean => {
        return wcsType && (wcsType === WCSType.AUTOMATIC || wcsType === WCSType.DEGREES || wcsType === WCSType.SEXIGESIMAL) ? true : false;
    };
}