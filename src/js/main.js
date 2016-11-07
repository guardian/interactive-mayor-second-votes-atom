import './polyfill/classList'
import './polyfill/rAF'

import TWEEN from 'tween.js'

import svg from './lib/svg'
import range from './lib/range'
import shuffle from './lib/shuffle'
import sendEvent from './lib/sendEvent'

import allVotes from './data/votes2012_2.json'

const parties = ['con', 'lab', 'green', 'libdem', 'independent', 'ukip', 'bnp'];
const partyNames = {
    'con': 'Con',
    'lab': 'Lab',
    'green': 'Green',
    'libdem': 'LD',
    'independent': 'Ind.',
    'ukip': 'Ukip',
    'bnp': 'BNP'
};

const SPACING = 5;
const VOTE_COUNT = 5000;
// number of votes to win without 2nd round
const VOTE_THRESHOLD = allVotes.total.first / 2;

// TODO: improve
var voteSize = window.innerWidth < 480 ? 4 : 6;
window.addEventListener('resize', () => {
    voteSize = window.innerWidth < 480 ? 4 : 6;
});

// TODO: remove
const firstVotes = parties.map(party => {
    return {'name': party, 'votes': [{party, 'count': allVotes[party].first}]};
});
const conLabFirstVotes = firstVotes.filter(group => group.name === 'con' || group.name === 'lab');

const secondVotes = parties.map(party1 => {
    var votes = parties.map(party2 => {
        return {'party': party2, 'count': allVotes[party1].second[party2]};
    });
    return {'name': party1, votes};
});

function calcBoxSize(width, totalVotes) {
    var boxWidth = (width - SPACING * (parties.length - 1)) / parties.length;
    var numCols = Math.floor((boxWidth - SPACING) / voteSize);
    var numRows = Math.ceil(totalVotes / VOTE_COUNT / numCols);
    return [boxWidth, numRows * voteSize + SPACING];
}

function calcChoiceSize(width, groups) {
    var groupVoteCounts = groups.map(group => group.votes.reduce((sum, vote) => sum + vote.count, 0));
    var maxVotes = Math.max.apply(null, groupVoteCounts);
    return calcBoxSize(width, maxVotes);
}

function calcBucketSize(width) {
    return calcBoxSize(width, VOTE_THRESHOLD);
}

function calcChoice(boxWidth, offset, groups, flip, extra=0) {
    var offsetX = offset[0], offsetY = offset[1];
    var votesPerRow = Math.floor((boxWidth - SPACING) / voteSize);
    var baseX = voteSize / 2 + (boxWidth - votesPerRow * voteSize) / 2 + offsetX;
    var baseY = voteSize / 2 + SPACING / 2;

    var groupCircles = groups.map((group, groupNo) => {
        var groupX = baseX + (boxWidth + SPACING) * groupNo;

        return group.votes.reduce((circles, vote) => {
            var offset = circles.length;
            var newCircles = range(offset, Math.round(vote.count / VOTE_COUNT) + offset + extra).map(i => {
                var x = groupX + (i % votesPerRow) * voteSize;
                var y = baseY + Math.floor(i / votesPerRow) * voteSize;
                return {
                    'coord': [x, offsetY + (flip ? -y : y)],
                    'groupName': group.name,
                    'party': vote.party
                };
            });

            return circles.concat(newCircles);
        }, []);
    });

    return groupCircles;
}

// render functions

function voteCircle(el, coord, groupName, party) {
    var x = coord[0], y = coord[1];
    var counted = groupName === 'lab' || groupName === 'con' || party !== 'lab' && party !== 'con' ?
        'is-uncounted' : 'is-counted';
    var gmain = groupName === 'lab' || groupName === 'con' ? 'is-gmain' : 'is-notgmain';
    var main = party === 'lab' || party === 'con' ? 'is-main' : 'is-notmain';
    var clazz = `mayor-sv__vote ${counted} ${gmain} ${main} is-group-${groupName} is-party-${party}`;
    svg.circle(el, clazz, [x, y], voteSize / 2);
}

function choice(el, offset, width, groups, flip=false, extra=0) {
    var choiceSize = calcChoiceSize(width, groups);
    var boxWidth = choiceSize[0], boxHeight = choiceSize[1];

    var extras = calcChoice(boxWidth, offset, groups, flip, extra).map(circles => {
        circles.slice(0, circles.length - extra).forEach(circle => {
            voteCircle(el, circle.coord, circle.groupName, circle.party);
        });
        return circles.slice(circles.length - extra);
    });

    return extra > 0 ? extras : boxHeight;
}

function choiceText(el, offset, text) {
    var offsetX = offset[0], offsetY = offset[1];
    svg.text(el, 'mayor-sv__choice', text, [offsetX, offsetY + 15]);
    return 18;
}

function buckets(el, offset, width, count=parties.length) {
    var offsetX = offset[0], offsetY = offset[1];
    var bucketSize =  calcBucketSize(width);
    var boxWidth = bucketSize[0], boxHeight = bucketSize[1];

    var y1 = offsetY;
    var y2 = y1 + boxHeight;

    parties.slice(0, count).forEach((party, no) => {
        var x1 = offsetX + (boxWidth + SPACING) * no;
        var x2 = x1 + boxWidth;
        var d = 'M' + [[x1, y1], [x1, y2], [x2, y2], [x2, y1]].join('L');
        var main = party === 'lab' || party === 'con' ? 'is-main' : 'is-notmain';
        svg.path(el, `mayor-sv__bucket is-${party} ${main}`, d);
    });
    return boxHeight;
}

var step1 = svg.renderer('step1', (el, width) => [
    h => choiceText(el, [0, h], 'First choice'),
    h => {
        var boxWidth = calcBucketSize(width)[0];
        var votesPerRow = Math.floor((boxWidth - SPACING) / voteSize);
        var baseX = (boxWidth - votesPerRow * voteSize) / 2;
        parties.forEach((party, i) => {
            svg.text(el, 'mayor-sv__party is-' + party, partyNames[party], [(boxWidth + SPACING) * i + baseX, h + 16]);
        });
        return 18;
    },
    h => choice(el, [0, h], width, firstVotes),
    h => 10,
    h => choiceText(el, [0, h], 'Corresponding second choice'),
    h => choice(el, [0, h], width, secondVotes)
]);

var step2 = function (el) {
    var offset;

    return svg.renderer('step2', (el, width) => [
        h => choice(el, [0, h], width, firstVotes),
        h => 40,
        h => {
            var bucketH = buckets(el, [0, h], width);
            var textX = (width / parties.length) * (2 + 2.5);
            svg.text(el, 'mayor-sv__note', 'These parties don\'t go', [textX, h + bucketH / 2 - 8]);
            svg.text(el, 'mayor-sv__note', 'on to the second round', [textX, h + bucketH / 2 + 8]);
            offset = h;
            return bucketH;
        }
    ], {
        'go': (el, width) => {
            var bucketSize =  calcBucketSize(width);
            var bucketWidth = bucketSize[0], bucketHeight = bucketSize[1];
            var choices = calcChoice(bucketWidth, [0, offset + bucketHeight], firstVotes, true);

            firstVotes.forEach((group, groupI) => {
                var voteEls = $$(el, '.mayor-sv__vote.is-group-' + group.name);
                var outEls = $$(el, '.mayor-sv__note, .is-notmain');
                animateMoveEls(voteEls, 4000, choices[groupI], () => {
                    outEls.forEach(outEl => outEl.classList.add('mk-uncounted'));
                });
            });
        }
    })(el);
};

var step3 = function (el) {
    var offset, extras;

    return svg.renderer('step3', (el, width) => [
        h => choice(svg.group(el, 'js-step3-second'), [0, h], width, secondVotes),
        h => 40,
        h => {
            var bucketWidth =  calcBucketSize(width)[0];
            var bucketH = buckets(el, [0, h], width, 2);
            svg.text(el, 'mayor-sv__note is-con', 'Winner', [bucketWidth * 0.5, h - 6])
            extras = choice(svg.group(el, 'js-step3-first'), [0, h + bucketH], width, conLabFirstVotes, true, 30);
            offset = h;
            return bucketH;
        }
    ], {
        'go': (el, width) => {
            var els = $$(el, '.js-step3-second .is-uncounted');
            var conEls = $$(el, '.js-step3-second .is-party-con.is-counted');
            var labEls = $$(el, '.js-step3-second .is-party-lab.is-counted');
            var outEls = $$(el, '.mayor-sv__bucket.is-lab, .mayor-sv__note, .js-step3-first .is-party-lab');

            animateMoveEls(conEls, 2000, extras[0]);
            animateMoveEls(labEls, 2000, extras[1], () => {
                animateExplodeEls(els, 1500, () => {
                    outEls.forEach(outEl => outEl.classList.add('mk-uncounted'));
                    labEls.forEach(labEl => labEl.classList.add('mk-uncounted'));
                });
            });
        }
    })(el);
}

var step4fn = (el, width) => [ h => choice(el, [0, h], width, secondVotes) ];

var step4 = svg.renderer('step4', step4fn);

var step4top2 = svg.renderer('step4', step4fn, {
    'top2': (el, width) => {
        animateExplodeEls($$(el, '.is-gmain.is-main'), 1500);
    }
});

var step4topother = svg.renderer('step4', step4fn, {
    'topother': (el, width) => {
        animateExplodeEls($$(el, '.is-gmain.is-notmain'), 1500);
    }
});

var step4nottop = svg.renderer('step4', step4fn, {
    'nottop': (el, width) => {
        animateExplodeEls($$(el, '.is-notgmain.is-notmain'), 1500);
    }
});

function ballot(el, section) {
    var ref = el.getAttribute('data-ref');
    window.addEventListener(ref + ':go', () => {
        el.classList.add('mk-animate');
    });
}

function animateEls(els, duration, fn, finish = _ => _) {
    var lastI = 0;

    new TWEEN.Tween({'i': 0})
        .to({'i': els.length - 1}, duration)
        .easing(TWEEN.Easing.Quadratic.In)
        .onUpdate(function () {
            for (; lastI <= this.i; lastI++) {
                let subtween = fn(els[lastI], lastI);
                if (lastI === els.length - 1) subtween.onComplete(finish);
            }
        })
        .start();
}

function animateExplodeEls(els, duration, finish) {
    return animateEls(shuffle(els), duration, voteEl => {
        voteEl.classList.add('mk-uncounted')

        return new TWEEN.Tween({'size': voteSize})
            .to({'size': [voteSize * 2, voteSize]}, 300)
            .onUpdate(function () {
                voteEl.setAttribute('r', this.size / 2);
            })
            .start();
    }, finish);
}

function animateMoveEls(els, duration, coords, finish) {
    return animateEls(shuffle(els), duration, (voteEl, voteI) => {
        var x1 = parseFloat(voteEl.getAttribute('cx'));
        var y1 = parseFloat(voteEl.getAttribute('cy'));
        var x2 = coords[voteI].coord[0];
        var y2 = coords[voteI].coord[1];

        return new TWEEN.Tween({'x': x1, 'y': y1})
            .to({'x': [x2, x2], 'y': [y2 - 60, y2]}, 500)
            .easing(TWEEN.Easing.Cubic.In)
            .interpolation(TWEEN.Interpolation.Bezier)
            .onUpdate(function () {
                voteEl.setAttribute('cx', this.x);
                voteEl.setAttribute('cy', this.y);
            })
            .start();
    }, finish);
}

const $ = (el, s) => el.querySelector(s);
const $$ = (el, s) => [].slice.apply(el.querySelectorAll(s));

function animate() {
    TWEEN.update();
    window.requestAnimationFrame(animate);
}

function getOffset(el) {
    return el ? el.offsetTop + getOffset(el.offsetParent) : 0;
}

function app(el) {
    step1($(el, '.js-step1'));
    step2($(el, '.js-step2'));
    step3($(el, '.js-step3'));
    step4($(el, '.js-step4'));
    step4top2($(el, '.js-step4top2'));
    step4topother($(el, '.js-step4topother'));
    step4nottop($(el, '.js-step4nottop'));

    $$(el, '.js-ballot').forEach(ballot);

    $$(el, '.js-replay').forEach(replayEl => {
        var ref = replayEl.getAttribute('data-replay');
        replayEl.addEventListener('click', () => {
            sendEvent(ref + ':replay');
            sendEvent(ref + ':go');
        });
        window.addEventListener(ref + ':go', () => {
            replayEl.removeAttribute('disabled');
        });
    });

    var triggers = $$(el, '.js-trigger').map(triggerEl => {
        return {
            'el': triggerEl,
            'evt': triggerEl.getAttribute('data-trigger')
        };
    });

    function calcOffsets() {
        var offset = window.innerWidth < 480 ? 60 : 100;
        triggers.forEach(trigger => {
            trigger.offset = getOffset(trigger.el) - offset;
        });
    }
    window.addEventListener('resize', calcOffsets);
    calcOffsets();

    window.addEventListener('scroll', () => {
        if (triggers.length === 0) return;
        var offsetY = window.pageYOffset;
        while (triggers[0] && triggers[0].offset < offsetY) {
            sendEvent(triggers.shift().evt);
        }
    });

    window.requestAnimationFrame(animate);

    // page janking on frontend
    window.scrollTo(0, 0);
}

var el = document.querySelector('.js-mayor-interactive');
app(el);
