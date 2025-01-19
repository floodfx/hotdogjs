/**
 * Takes a list of file entries and uploads them to S3, tracking progress, as we go.
 *
 * TODO use types for entries
 */
export function S3(entries: any, onViewError: Function) {
  entries.forEach((entry: any) => {
    let formData = new FormData();
    // get s3 URL and fields from the entry metadata
    let { url, fields } = entry.meta;
    // add each field to the FormData object
    Object.entries(fields).forEach(([key, val]) => formData.append(key, val as string));
    // add the file to the FormData object
    formData.append("file", entry.file);

    let xhr = new XMLHttpRequest();
    onViewError(() => xhr.abort());
    // when status is 204, the file has been uploaded successfully so progress is 100%
    xhr.onload = () => (xhr.status === 204 ? entry.progress(100) : entry.error());
    xhr.onerror = () => entry.error();

    // track upload progress
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        let percent = Math.round((event.loaded / event.total) * 100);
        if (percent < 100) {
          entry.progress(percent);
        }
      }
    });

    // POST the file to the S3 URL
    xhr.open("POST", url, true);
    xhr.send(formData);
  });
}
