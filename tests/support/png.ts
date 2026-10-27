/** Width and height of a PNG, read from its header. Throws if the bytes aren't a PNG. */
export function pngSize(png: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, i) => png[i] === byte)) throw new Error('Not a PNG file');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  // The IHDR chunk always comes first: width and height are its first two 4-byte fields.
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
