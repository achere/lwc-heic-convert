import LIBHEIF from "@salesforce/resourceUrl/libheif";
import { loadScript } from "lightning/platformResourceLoader";

class HeicConvert {
  async init(component) {
    await loadScript(component, LIBHEIF);

    // ======== heic-decode ========
    const decode = () => {
      // -------- heic-decode.lib --------
      const uint8ArrayUtf8ByteString = (array, start, end) => {
        return String.fromCharCode(...new Uint8Array(array, start, end - start));
      };

      // brands explained: https://github.com/strukturag/libheif/issues/83
      // code adapted from: https://github.com/sindresorhus/file-type/blob/6f901bd82b849a85ca4ddba9c9a4baacece63d31/core.js#L428-L438
      const isHeic = (buffer) => {
        const brandMajor = uint8ArrayUtf8ByteString(buffer, 8, 12).replace("\0", " ").trim();

        switch (brandMajor) {
          case "mif1":
            return true; // {ext: 'heic', mime: 'image/heif'};
          case "msf1":
            return true; // {ext: 'heic', mime: 'image/heif-sequence'};
          case "heic":
          case "heix":
            return true; // {ext: 'heic', mime: 'image/heic'};
          case "hevc":
          case "hevx":
            return true; // {ext: 'heic', mime: 'image/heic-sequence'};
        }

        return false;
      };

      const decodeImage = async (image) => {
        const width = image.get_width();
        const height = image.get_height();

        const { data } = await new Promise((resolve, reject) => {
          image.display(
            { data: new Uint8ClampedArray(width * height * 4), width, height },
            (displayData) => {
              if (!displayData) {
                return reject(new Error("HEIF processing error"));
              }

              resolve(displayData);
            }
          );
        });

        return { width, height, data };
      };

      const decodeLib = (libheif) => {
        const decodeBuffer = async ({ buffer, all }) => {
          if (!isHeic(buffer)) {
            throw new TypeError("input buffer is not a HEIC image");
          }

          // wait for module to be initialized
          // currently it is synchronous but it might be async in the future
          await libheif.ready;

          const decoder = new libheif.HeifDecoder();
          const data = decoder.decode(buffer);

          if (!data.length) {
            throw new Error("HEIF image not found");
          }

          if (!all) {
            return await decodeImage(data[0]);
          }

          return data.map((image) => {
            return {
              width: image.get_width(),
              height: image.get_height(),
              decode: async () => await decodeImage(image)
            };
          });
        };

        return {
          one: async ({ buffer }) => await decodeBuffer({ buffer, all: false }),
          all: async ({ buffer }) => await decodeBuffer({ buffer, all: true })
        };
      };

      // -------- heic-decode.index --------
      const libheif = window.libheif();

      const { one, all } = decodeLib(libheif);
      one.all = all;

      return one;
    };

    // ======== heic-convert ========
    // -------- heic-convert.formats --------
    const initializeCanvas = ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      return canvas;
    };

    const convert = async ({ data, width, height }, ...blobArgs) => {
      const canvas = initializeCanvas({ width, height });

      const ctx = canvas.getContext("2d");
      ctx.putImageData(new ImageData(data, width, height), 0, 0);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              return resolve(blob);
            }

            return reject(new Error("failed to convert the image"));
          },
          ...blobArgs
        );
      });

      const arrayBuffer = await blob.arrayBuffer();

      return new Uint8Array(arrayBuffer);
    };

    const formats = {
      JPEG: async ({ data, width, height, quality }) =>
        await convert({ data, width, height }, "image/jpeg", quality),
      PNG: async ({ data, width, height }) => await convert({ data, width, height }, "image/png")
    };

    // -------- heic-convert.lib --------
    const lib = (decode, encode) => {
      const convertImage = async ({ image, format, quality }) => {
        return await encode[format]({
          width: image.width,
          height: image.height,
          data: image.data,
          quality
        });
      };

      const convert = async ({ buffer, format, quality, all }) => {
        if (!encode[format]) {
          throw new Error(`output format needs to be one of [${Object.keys(encode)}]`);
        }

        if (!all) {
          const image = await decode({ buffer });
          return await convertImage({ image, format, quality });
        }

        const images = await decode.all({ buffer });

        return images.map((image) => {
          return {
            convert: async () =>
              await convertImage({
                image: await image.decode(),
                format,
                quality
              })
          };
        });
      };

      return {
        one: async ({ buffer, format, quality = 0.92 }) =>
          await convert({ buffer, format, quality, all: false }),
        all: async ({ buffer, format, quality = 0.92 }) =>
          await convert({ buffer, format, quality, all: true })
      };
    };

    // -------- heic-convert.index --------
    const { one, all } = lib(decode(), formats);

    return { one, all };
  }
}

export { HeicConvert };
