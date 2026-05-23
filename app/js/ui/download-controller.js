/* ============================================
   DOWNLOAD CONTROLLER - download file temporanei
   ============================================ */

const DownloadController = (() => {
    function getDocument(options) {
        return options.document || document;
    }

    function getUrlApi(options) {
        return options.URL || URL;
    }

    function getBlobClass(options) {
        return options.Blob || Blob;
    }

    function download(content, filename, mime, options = {}) {
        const doc = getDocument(options);
        const urlApi = getUrlApi(options);
        const BlobClass = getBlobClass(options);
        const blob = new BlobClass([content], { type: mime });
        const objectUrl = urlApi.createObjectURL(blob);
        const link = doc.createElement('a');

        link.href = objectUrl;
        link.download = filename;

        let appended = false;
        try {
            doc.body.appendChild(link);
            appended = true;
            link.click();
        } finally {
            if (appended) {
                if (link.parentNode) link.parentNode.removeChild(link);
                else doc.body.removeChild(link);
            }
            urlApi.revokeObjectURL(objectUrl);
        }

        return {
            filename,
            mime,
            url: objectUrl
        };
    }

    return {
        download
    };
})();
