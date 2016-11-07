export default function range(start, end, step=1) {
    var ret = [];
    for (; start < end; start += step) {
        ret.push(start);
    }
    return ret;
}
