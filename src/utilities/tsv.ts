export function exportTsvFile(imageName: string, plotName: string, content: string) {
    const tsvData = `data:text/tab-separated-values;charset=utf-8,${content}\n`;
    const dataURL = encodeURI(tsvData).replace(/#/g, "%23");

    const a = document.createElement("a") as HTMLAnchorElement;
    a.href = dataURL;

    const now = new Date();
    const timeStamp = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;

    a.download = `${imageName}-${plotName.replace(" ", "-")}-${timeStamp}.tsv`;
    a.dispatchEvent(new MouseEvent("click"));

    return null
}