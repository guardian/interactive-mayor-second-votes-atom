import xr from 'xr'

export default function fetchJSON(url) {
    let shouldBeHTTPS = document.location.protocol !== 'http:'

    let fixedUrl = url.replace(/^https?:/, shouldBeHTTPS ? 'https:' : 'http:')

    return xr.get(fixedUrl);
}
