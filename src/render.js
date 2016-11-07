import config from '../config.json'

import rp from 'request-promise-native'
import doT from 'dot'

import titleHTML from './src/templates/title.html!text'
import imgHTML from './src/templates/img.html!text'
import textHTML from './src/templates/text.html!text'
import ballotHTML from './src/templates/ballot.html!text'

const sectionTypes = {
    'title': doT.template(titleHTML),
    'img': doT.template(imgHTML),
    'text': doT.template(textHTML),
    'ballot': doT.template(ballotHTML)
}

function _render(data) {
    data.sections.forEach(section => {
        if (section.copy) {
            section.copy = section.copy.replace(/[\r\n]+/, '\n').split('\n');
        } else {
            section.copy = [];
        }
        if (section.type === 'ballot') {
            section.first = parseInt(section.first);
            section.second = parseInt(section.second);
        }
    });

    return [
        '<div class="mayor-container js-mayor-interactive">',
            data.sections.map(section => (sectionTypes[section.type] || (_ => ''))({section, config})).join(''),
        '</div>'
    ].join('');
}

export function render() {
    return rp({'uri': config.docData, 'json': true}).then(_render);
}
