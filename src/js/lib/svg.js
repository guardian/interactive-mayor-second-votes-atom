const xmlns = 'http://www.w3.org/2000/svg';

function svgEl(parentEl, type, clazz='', attrs={}) {
    var el = document.createElementNS(xmlns, type);

    if (clazz) el.setAttributeNS(null, 'class', clazz);

    for (var attr in attrs) {
        el.setAttributeNS(null, attr, attrs[attr]);
    }

    parentEl.appendChild(el);
    return el;
}

export function group(parentEl, clazz='', attrs={}) {
    return svgEl(parentEl, 'g', clazz, attrs);
}

export function text(parentEl, clazz, text, coord) {
    var x = coord[0], y = coord[1];
    var ret = svgEl(parentEl, 'text', clazz, {x, y});
    ret.textContent = text;
    return ret;
}

export function line(parentEl, clazz, coords) {
    var coord1 = coords[0], coord2 = coords[1];
    var x1 = coord1[0], y1 = coord1[1];
    var x2 = coord2[0], y2 = coord2[1];
    return svgEl(parentEl, 'line', clazz, {x1, y1, x2, y2});
}

export function circle(parentEl, clazz, coord, r) {
    var cx = coord[0], cy = coord[1];
    return svgEl(parentEl, 'circle', clazz, {cx, cy, r});
}

export function path(parentEl, clazz, d) {
    return svgEl(parentEl, 'path', clazz, {d});
}

var renderers = [];
export function renderer(name, sectionFns, evts) {
    return el => {
        var width;

        function render(force=false) {
            var rect = el.getBoundingClientRect();
            if (rect.width === width && !force) return;
            width = rect.width;

            while (el.lastChild) {
                el.removeChild(el.lastChild);
            }

            var height = sectionFns(el, width).reduce((height, sectionFn) => height + sectionFn(height), 0);
            el.setAttribute('viewBox', `0 0 ${width} ${height}`);
            el.style.height = height + 'px';
        }

        for (var evt in evts) {
            (evt => {
                window.addEventListener(`${name}:${evt}`, () => evts[evt](el, width));
            })(evt);
        }

        window.addEventListener(name + ':replay', () => render(true));

        renderers.push(render);
        render();
    }
}

window.addEventListener('resize', () => {
    window.requestAnimationFrame(() => renderers.forEach(r => r()));
});

export default {group, text, line, circle, path, renderer};
