/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
var counter = 0;

/********************************************************************
 * should the questioncando field be updated?
 *********************************************************************/
var shouldUpdateCando = function (filename) {
    var lowerFilename = filename.toLowerCase();
    if (lowerFilename[3] === 'r' || lowerFilename[3] === 'w') {
        // console.log(filename + ' needs to have cando updated.');
        return true;
    } else {
        return false;
    }
};

/********************************************************************
 * Updates the Question can-do field from incorrect values.
 *********************************************************************/
var updateQuestionCanDo = function (acc, curr) {
    if (curr.questioncando !== undefined && acc.options.updateCanDoField) {
        if (curr.questioncando === 'f9') { // and file is for read or write,
            console.log('Updating f9 to f10!');
            curr.questioncando = 'f10'; // f9 to f10
        } else if (curr.questioncando === 'f10') {
            console.log('Updating f10 to f11!');
            curr.questioncando = 'f11'; // f10 to f11
        } else if (curr.questioncando === 'f11') {
            console.log('Updating f11 to f9!');
            curr.questioncando = 'f9'; // f11 to f9
        } else if (curr.questioncando === 'f31') {
            console.log('Updating f31 to f30!');
            curr.questioncando = 'f30'; // f31 to f30
        }
    }
};

/********************************************************************
 *  splitQuestionName into questionname and passagename
 *********************************************************************/
var splitQuestionName = function (acc, curr) {
    var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
    curr.questionname = pqname.replace(/passage\d+/i, '');
    curr.passagename = pqname.replace(/question\d+/i, '');
};

/********************************************************************
 * Renames then deletes some keys on the json.
 *********************************************************************/
var deleteKeys = function (acc, curr) {
    curr.passageaudiotranscript = curr.passageaudiofilename;
    curr.questionaudiotranscript = curr.questionaudiofilename;
    delete curr.passageaudiofilename;
    delete curr.questionaudiofilename;
};

/********************************************************************
 * Edit passagetext: removeText
 * 
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var replaceText = function (acc, curr, $) {
    if ($('h1').first().text().toLowerCase() === 'instructions') {
        if ($('h2').first().text().toLowerCase() === 'warm-up') {
            // Remove everything between h1 instructions and h2 warm-up
            $('h1').first().nextUntil('h2').remove('*');
        }
        // Remove instructions h1 tag
        $('h1').first().remove('*');
    }
    if ($('h2').first().text().toLowerCase() === 'warm-up'){
        // replaced warm-up with definitions
        $('h2').first().after('<h2>Definitions</h2>'); // add definitions h2 tag after warm-up h2 tag
        $('h2').first().remove(); // remove warm-up h2 tag
        if ($('h2').first().text().toLowerCase() === 'definitions') {
            // console.log($('h2').first().nextUntil('h2').not($('p').has('strong')).length);
            $('h2').first().nextUntil('h2').not($('p').has('strong')).remove();
        }
    }
};

/********************************************************************
 * Edit passagetext: addClassDefinitions
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addClassDefinitions = function (acc, curr, $) {
    // Gets all the <p><strong> combinations between the first h2 tag and the next one.
    var pstrong = $('h2').first().nextUntil('h2').filter('p').has('strong');
    var pem = $('h2').first().nextUntil('h2').filter('p').has('em');
    pstrong.addClass('vocab-definition');
    pem.removeClass('vocab-definition');
    pem.addClass('vocab-example');
    curr.passagetext = $.html();
};

/********************************************************************
 * Edit passagetext: addDivsAround
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addDivsAround = function (acc, curr, $) {
    if ($('h2').first().text().toLowerCase() === 'definitions') {
        $('h2').first().nextUntil('h2').add($('h2').first()).first().before($('<div class="definitions-container">'));
        $('h2').first().nextUntil('h2').add($('h2').first()).last().after($('<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>'));
        // $('.addclosingdiv').replaceWith('div');
        // $('h2').first().nextUntil('h2').add($('h2').first()).wrap($('<div class="definitions-container"></div>'));
    }
    if ($('h2').last().text().toLowerCase() === 'passage'){
        $('h2').last().nextAll().add($('h2').last()).first().before($('<div class="passage-container">'));
        $('h2').last().nextAll().add($('h2').last()).last().after($('<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>'));
        // $('.addclosingdiv').replaceWith('div');
        // $('h2').last().nextAll().add($('h2').last()).wrap($('<div class="passage-container"></div>'));
    }
};

/********************************************************************
 * Edit passagetext: Fix Cheerio
 * DESCRIPTION: Cheerio thinks its so smart and needs to add stuff we
 *              don't want in both html and xml mode. This function
 *              fixes those problems by editing the string directly
 *              and putting stuff where it belongs.
 * USE: in reduce function.Needs accumulator, current item, and
 *      cheerio object 
 * RETURNS: void
 *********************************************************************/
var fixCheerio = function (acc, curr) {
    if (curr.passagetext.includes('<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>')) {
        curr.passagetext = curr.passagetext.replace(/<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay<\/div>/g, '</div>');
    }
    if (curr.passagetext.includes('</link>')){curr.passagetext = curr.passagetext.replace(/<\/link>/g, '');}
    // if (curr.passagetext.includes('<html>')){curr.passagetext = curr.passagetext.replace(/<html>/g, '');}
    // if (curr.passagetext.includes('</html>')){curr.passagetext = curr.passagetext.replace(/<\/html>/g, '');}
    // if (curr.passagetext.includes('<head>')){curr.passagetext = curr.passagetext.replace(/<head>/g, '');}
    // if (curr.passagetext.includes('</head>')){curr.passagetext = curr.passagetext.replace(/<\/head>/g, '');}
    // if (curr.passagetext.includes('<body>')){curr.passagetext = curr.passagetext.replace(/<body>/g, '');}
    // if (curr.passagetext.includes('</body>')){curr.passagetext = curr.passagetext.replace(/<\/body>/g, '');}
};

/********************************************************************
 * Edit passagetext
 *********************************************************************/
var editPassageText = function (acc, curr) {
    var $ = cheerio.load(curr.passagetext, {xmlMode: true}); // Declare Cheerio Object
    replaceText(acc, curr, $); // "Passage Content to Delete" Section
    addClassDefinitions(acc, curr, $); // "Adding Class Definitions"
    addDivsAround(acc, curr, $); // "Add Divs" Section
    curr.passagetext = $.html();
    fixCheerio(acc, curr);
};

/********************************************************************
 * Main Reducer Function
 *********************************************************************/
var reducer = function (acc, curr, i) {
    updateQuestionCanDo(acc, curr);
    deleteKeys(acc, curr);
    splitQuestionName(acc, curr);
    editPassageText(acc, curr);
    acc.push(curr);
    return acc;
};

/********************************************************************
 * async outputfile
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, csvToOutput) {
    var outputLocation = outputDirectory + Date.now() + '_' + outputName;
    fs.writeFile(outputLocation, csvToOutput, function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log('Output file to: ' + outputLocation);
        }
    });
};

/********************************************************************
 * main
 *********************************************************************/
function main() {
    // Get Array of Files to Cycle Through
    const targetDirectory = './csv-tests/ec3/';
    var outputDirectory = './csv-tests/ec3/ec3-outputs/';
    const targetFiles = [
        'FP_L1_DE_T11_POC4_V1_CSS.csv',
        'FP_R1_NA_T8_POC4_V1_CSS.csv',
        'FP_S1_NA_T9_POC4_V1_CSS.csv',
        'FP_W1_NE_T5_POC4_V1_CSS.csv'
    ];
    // Set Options:
    var csvrOptions = {
        headersOut: [
            'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
            'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename',
            'questionname', 'questioncando', 'questiontext', 'questionlevelfeedback',
            'questiontype', 'questionaudiotranscript', 'answertext1', 'answertext2',
            'answertext3', 'answertext4', 'answertext5', 'answertext6'
        ],
        initAcc: [],
        updateCanDoField: false
    };
    // cycle through each file
    var readEditWrite = function (file, callback) {
        csvrOptions.updateCanDoField = shouldUpdateCando(file); // update option's updateCanDoField variable
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var reducedcsv = csvr(csv, csvrOptions, reducer); // Send it through reducer
        var csvOutput = reducedcsv.getFormattedCSV(); // get reduced, formatted csv
        writeFile(outputDirectory, file, csvOutput);
        callback();
    };
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
    });
}

main();