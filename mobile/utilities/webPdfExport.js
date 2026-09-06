export const openPdfPrintDialogOnWeb = (html, title) =>
  new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Browser printing is unavailable."));
      return;
    }

    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("title", title);
    printFrame.style.position = "fixed";
    printFrame.style.width = "794px";
    printFrame.style.height = "1123px";
    printFrame.style.left = "-10000px";
    printFrame.style.top = "0";
    printFrame.style.border = "0";
    printFrame.style.opacity = "0";

    const removeFrame = () => {
      setTimeout(() => printFrame.remove(), 1000);
    };

    printFrame.onload = () => {
      try {
        const printWindow = printFrame.contentWindow;
        if (!printWindow) {
          throw new Error("Browser printing is unavailable.");
        }
        printWindow.document.title = title;
        printWindow.focus();
        printWindow.print();
        removeFrame();
        resolve("web-print-dialog");
      } catch (error) {
        printFrame.remove();
        reject(error);
      }
    };

    printFrame.srcdoc = html;
    document.body.appendChild(printFrame);
  });

export default openPdfPrintDialogOnWeb;
