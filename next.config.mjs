/** @type {import('next').NextConfig} */
const nextConfig = {
  // Nothing here needs a server: two routes, both static, and one WebGL
  // canvas. Exporting always rather than only in CI keeps what is published
  // the same build as what is developed against.
  output: "export",
  // A static host serves a directory from its index.html, so every route has
  // to be a directory rather than a bare .html file.
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
