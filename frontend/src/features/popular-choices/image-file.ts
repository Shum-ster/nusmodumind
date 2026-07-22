const maxCoverImageFileSizeBytes = 7 * 1024 * 1024;
const maxCoverImageFileSizeMegabytes = 7;

export function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Choose an image file for the cover.'));
      return;
    }

    if (file.size > maxCoverImageFileSizeBytes) {
      reject(
        new Error(
          `Choose a cover image smaller than ${maxCoverImageFileSizeMegabytes} MB.`,
        ),
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read cover image.'));
      }
    };
    reader.onerror = () => reject(new Error('Unable to read cover image.'));
    reader.readAsDataURL(file);
  });
}
