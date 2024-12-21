import fs from 'fs';

/* Private Constants */
const DECIPHER_NAME_REGEXPS = ['\\bm=([a-zA-Z0-9$]{2,})\\(decodeURIComponent\\(h\\.s\\)\\)', '\\bc&&\\(c=([a-zA-Z0-9$]{2,})\\(decodeURIComponent\\(c\\)\\)', '(?:\\b|[^a-zA-Z0-9$])([a-zA-Z0-9$]{2,})\\s*=\\s*function\\(\\s*a\\s*\\)\\s*\\{\\s*a\\s*=\\s*a\\.split\\(\\s*""\\s*\\)', '([\\w$]+)\\s*=\\s*function\\((\\w+)\\)\\{\\s*\\2=\\s*\\2\\.split\\(""\\)\\s*;'];

// LavaPlayer regexps
const VARIABLE_PART = '[a-zA-Z_\\$][a-zA-Z_0-9]*',
    VARIABLE_PART_DEFINE = `\\"?${VARIABLE_PART}\\"?`,
    BEFORE_ACCESS = '(?:\\[\\"|\\.)',
    AFTER_ACCESS = '(?:\\"\\]|)',
    VARIABLE_PART_ACCESS = BEFORE_ACCESS + VARIABLE_PART + AFTER_ACCESS,
    REVERSE_PART = ':function\\(\\w\\)\\{(?:return )?\\w\\.reverse\\(\\)\\}',
    SLICE_PART = ':function\\(\\w,\\w\\)\\{return \\w\\.slice\\(\\w\\)\\}',
    SPLICE_PART = ':function\\(\\w,\\w\\)\\{\\w\\.splice\\(0,\\w\\)\\}',
    SWAP_PART = ':function\\(\\w,\\w\\)\\{var \\w=\\w\\[0\\];\\w\\[0\\]=\\w\\[\\w%\\w\\.length\\];\\w\\[\\w(?:%\\w.length|)\\]=\\w(?:;return \\w)?\\}',
    DECIPHER_REGEXP = `function(?: ${VARIABLE_PART})?\\(([a-zA-Z])\\)\\{` + '\\1=\\1\\.split\\(""\\);\\s*' + `((?:(?:\\1=)?${VARIABLE_PART}${VARIABLE_PART_ACCESS}\\(\\1,\\d+\\);)+)` + 'return \\1\\.join\\(""\\)' + `\\}`,
    HELPER_REGEXP = `var (${VARIABLE_PART})=\\{((?:(?:${VARIABLE_PART_DEFINE}${REVERSE_PART}|${VARIABLE_PART_DEFINE}${SLICE_PART}|${VARIABLE_PART_DEFINE}${SPLICE_PART}|${VARIABLE_PART_DEFINE}${SWAP_PART}),?\\n?)+)\\};`,
    SCVR = '[a-zA-Z0-9$_]',
    MCR = `${SCVR}+`,
    AAR = '\\[(\\d+)]',
    N_TRANSFORM_NAME_REGEXPS = [`${SCVR}="nn"\\[\\+${MCR}\\.${MCR}],${MCR}\\(${MCR}\\),${MCR}=${MCR}\\.${MCR}\\[${MCR}]\\|\\|null\\).+\\|\\|(${MCR})\\(""\\)`, `${SCVR}="nn"\\[\\+${MCR}\\.${MCR}],${MCR}\\(${MCR}\\),${MCR}=${MCR}\\.${MCR}\\[${MCR}]\\|\\|null\\)&&\\(${MCR}=(${MCR})${AAR}`, `${SCVR}="nn"\\[\\+${MCR}\\.${MCR}],${MCR}=${MCR}\\.get\\(${MCR}\\)\\).+\\|\\|(${MCR})\\(""\\)`, `${SCVR}="nn"\\[\\+${MCR}\\.${MCR}],${MCR}=${MCR}\\.get\\(${MCR}\\)\\)&&\\(${MCR}=(${MCR})\\[(\\d+)]`, `\\(${SCVR}=String\\.fromCharCode\\(110\\),${SCVR}=${SCVR}\\.get\\(${SCVR}\\)\\)&&\\(${SCVR}=(${MCR})(?:${AAR})?\\(${SCVR}\\)`, `\\.get\\("n"\\)\\)&&\\(${SCVR}=(${MCR})(?:${AAR})?\\(${SCVR}\\)`];

// LavaPlayer regexps
const N_TRANSFORM_REGEXP = 'function\\(\\s*(\\w+)\\s*\\)\\s*\\{' + 'var\\s*(\\w+)=(?:\\1\\.split\\(.*?\\)|String\\.prototype\\.split\\.call\\(\\1,.*?\\)),' + '\\s*(\\w+)=(\\[.*?]);\\s*\\3\\[\\d+]' + '(.*?try)(\\{.*?})catch\\(\\s*(\\w+)\\s*\\)\\s*\\{' + '\\s*return"[\\w-]+([A-z0-9-]+)"\\s*\\+\\s*\\1\\s*}' + '\\s*return\\s*(\\2\\.join\\(""\\)|Array\\.prototype\\.join\\.call\\(\\2,.*?\\))};',
    DECIPHER_ARGUMENT = 'sig',
    N_ARGUMENT = 'ncode',
    DECIPHER_FUNC_NAME = 'YBDProjectDecipherFunc',
    N_TRANSFORM_FUNC_NAME = 'YBDProjectNTransformFunc';

/* ----------- */

/* Private Functions */
function matchRegex(regex, str) {
    const MATCH = str.match(new RegExp(regex, 's'));
    if (!MATCH) {
        throw new Error(`Could not match ${regex}`);
    }
    return MATCH;
}

function matchFirst(regex, str) {
    return matchRegex(regex, str)[0];
}

function matchGroup1(regex, str) {
    return matchRegex(regex, str)[1];
}

function getFunctionName(body, regexps) {
    let fn;
    for (const REGEX of regexps) {
        try {
            fn = matchGroup1(REGEX, body);
            try {
                fn = matchGroup1(`${fn.replace(/\$/g, '\\$')}=\\[([a-zA-Z0-9$\\[\\]]{2,})\\]`, body);
            } catch (err) {}
            break;
        } catch (err) {
            continue;
        }
    }

    if (!fn || fn.includes('[')) throw Error();
    return fn;
}

function getExtractFunctions(extractFunctions, body) {
    for (const extractFunction of extractFunctions) {
        try {
            const FUNC = extractFunction(body);
            if (!FUNC) continue;
            return FUNC;
        } catch {
            continue;
        }
    }

    return null;
}

/* Decipher */
function extractDecipherFunc(body) {
    try {
        const HELPER_OBJECT = matchFirst(HELPER_REGEXP, body),
            DECIPHER_FUNCTION = matchFirst(DECIPHER_REGEXP, body),
            RESULTS_FUNCTION = `var ${DECIPHER_FUNC_NAME}=${DECIPHER_FUNCTION};`,
            CALLER_FUNCTION = `${DECIPHER_FUNC_NAME}(${DECIPHER_ARGUMENT});`;
        return HELPER_OBJECT + RESULTS_FUNCTION + CALLER_FUNCTION;
    } catch (e) {
        return null;
    }
}

function extractDecipherWithName(body) {
    try {
        const DECIPHER_FUNCTION_NAME = getFunctionName(body, DECIPHER_NAME_REGEXPS),
            FUNC_PATTERN = `(${DECIPHER_FUNCTION_NAME.replace(/\$/g, '\\$')}function\\([a-zA-Z0-9_]+\\)\\{.+?\\})`,
            DECIPHER_FUNCTION = `var ${matchGroup1(FUNC_PATTERN, body)};`,
            HELPER_OBJECT_NAME = matchGroup1(';([A-Za-z0-9_\\$]{2,})\\.\\w+\\(', DECIPHER_FUNCTION),
            HELPER_PATTERN = `(var ${HELPER_OBJECT_NAME.replace(/\$/g, '\\$')}=\\{[\\s\\S]+?\\}\\};)`,
            HELPER_OBJECT = matchGroup1(HELPER_PATTERN, body),
            CALLER_FUNCTION = `${DECIPHER_FUNC_NAME}(${DECIPHER_ARGUMENT});`;

        return HELPER_OBJECT + DECIPHER_FUNCTION + CALLER_FUNCTION;
    } catch (e) {
        return null;
    }
}

/* N-Transform */
function extractNTransformFunc(body) {
    try {
        const N_FUNCTION = matchFirst(N_TRANSFORM_REGEXP, body),
            RESULTS_FUNCTION = `var ${N_TRANSFORM_FUNC_NAME}=${N_FUNCTION};`,
            CALLER_FUNCTION = `${N_TRANSFORM_FUNC_NAME}(${N_ARGUMENT});`;

        return RESULTS_FUNCTION + CALLER_FUNCTION;
    } catch (e) {
        return null;
    }
}

function extractNTransformWithName(body) {
    try {
        const N_FUNCTION_NAME = getFunctionName(body, N_TRANSFORM_NAME_REGEXPS),
            FUNCTION_PATTERN = `(${N_FUNCTION_NAME.replace(/\$/g, '\\$')}=\\s*function([\\S\\s]*?\\}\\s*return (([\\w$]+?\\.join\\(""\\))|(Array\\.prototype\\.join\\.call\\([\\w$]+?,[\\n\\s]*(("")|(\\("",""\\)))\\)))\\s*\\}))`,
            N_TRANSFORM_FUNCTION = `var ${matchGroup1(FUNCTION_PATTERN, body)};`,
            CALLER_FUNCTION = `${N_FUNCTION_NAME}(${N_ARGUMENT});`;

        return N_TRANSFORM_FUNCTION + CALLER_FUNCTION;
    } catch (e) {
        return null;
    }
}

function getDecipherFunction(body) {
    const DECIPHER_FUNCTION = getExtractFunctions([extractDecipherWithName, extractDecipherFunc], body);

    return {
        argumentName: DECIPHER_ARGUMENT,
        code: DECIPHER_FUNCTION || '',
    };
}

function getNTransformFunction(body) {
    const N_TRANSFORM_FUNCTION = getExtractFunctions([extractNTransformFunc, extractNTransformWithName], body);

    return {
        argumentName: N_ARGUMENT,
        code: N_TRANSFORM_FUNCTION || '',
    };
}

export { getDecipherFunction, getNTransformFunction };

function getPlayerId(body) {
    const MATCH = body.match(/player\\\/([a-zA-Z0-9]+)\\\//);

    if (MATCH) {
        return MATCH[1];
    }

    return null;
}

function adaptToConstants(id) {
    const DATA = fs.readFileSync(process.cwd() + '/src/utils/Constants.ts', 'utf8'),
        SPLIT_LINES = DATA.split('\n'),
        PLAYER_ID_LINE = SPLIT_LINES.findIndex((v) => v.startsWith('export const CURRENT_PLAYER_ID = '));

    SPLIT_LINES[PLAYER_ID_LINE] = `export const CURRENT_PLAYER_ID = '${id}';`;
    fs.writeFileSync(process.cwd() + '/src/utils/Constants.ts', SPLIT_LINES.join('\n'));

    console.log('Player ID has been successfully adapted.');
}

function adaptToPlayerJson(id) {
    const PLAYER_JSON = JSON.parse(fs.readFileSync(process.cwd() + '/data/player/data.json', 'utf8'));

    fetch(`https://www.youtube.com/s/player/${id}/player_ias.vflset/en_US/base.js`)
        .then((res) => res.text())
        .then((script) => {
            const SIGNATURE_TIMESTAMP = script.match(/signatureTimestamp:(\d+)/)[1];

            PLAYER_JSON.id = id;
            PLAYER_JSON.body = script;
            PLAYER_JSON.signatureTimestamp = SIGNATURE_TIMESTAMP;

            PLAYER_JSON.functions = {
                decipher: getDecipherFunction(script),
                nTransform: getNTransformFunction(script),
            };

            fs.writeFileSync(process.cwd() + '/data/player/data.json', JSON.stringify(PLAYER_JSON));
            fs.writeFileSync(process.cwd() + '/data/player/base.js', script);
            console.log('Player JSON has been successfully adapted.');
        })
        .catch((err) => {
            console.error('Failed to retrieve information from base.js:', err);
        });
}

fetch('https://www.youtube.com/iframe_api', {
    cache: 'no-store',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'x-browser-channel': 'stable',
        'x-browser-copyright': 'Copyright 2024 Google LLC. All rights reserved.',
        'x-browser-validation': 'g+9zsjnuPhmKvFM5e6eaEzcB1JY=',
        'x-browser-year': '2024',
    },
})
    .then((res) => res.text())
    .then((data) => {
        const PLAYER_ID = getPlayerId(data);

        if (PLAYER_ID) {
            console.log('The latest player ID has been successfully retrieved:', PLAYER_ID, '\n');
            console.log('Adapting player ID...');

            try {
                if (process.argv[2] !== '--only-player-json') {
                    adaptToConstants(PLAYER_ID);
                }

                adaptToPlayerJson(PLAYER_ID);
            } catch (err) {
                console.error('Failed to set the latest player ID: please manually adapt ' + PLAYER_ID + ' to utils/Constants.ts and data/player.json.');
                console.error('Error Details:', err);
            }
        } else {
            console.error('Failed to retrieve the latest player ID.');
        }
    })
    .catch((err) => {
        console.error('Failed to retrieve information from iframe_api:', err);
    });
