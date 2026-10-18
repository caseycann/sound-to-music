import { useObjectUrl } from './useObjectUrl.js'

const EXTENSIONS = { 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' }

export const extensionFor = (blob) => EXTENSIONS[blob.type.split(';')[0]] ?? 'audio'
const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function DownloadLink({ blob, name, label }) {
  const url = useObjectUrl(blob)
  if (!url) return null
  return (
    <a href={url} download={`${name}.${extensionFor(blob)}`}>
      {label} (.{extensionFor(blob)}, {formatSize(blob.size)})
    </a>
  )
}
