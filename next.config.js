/** @type {import('next').NextConfig} */

module.exports = {
  serverActions: {
    bodySizeLimit: '50mb',
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
}