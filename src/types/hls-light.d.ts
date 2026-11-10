// hls.js ships its light build (no EME/DRM, subtitles or alt-audio) without a
// separate declaration file. It exposes the same API, so reuse the main types.
declare module 'hls.js/light' {
  import Hls from 'hls.js';
  export * from 'hls.js';
  export default Hls;
}
