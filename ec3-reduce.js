/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
var errorDocument = 'The Following Errors Occurred While Parsing the EC3 CSVs On ' + Date() + '\n';
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
        curr.completedStatus.canDo.status = true;
    } else if (curr.questioncando === undefined) {
        curr.completedStatus.canDo.status = false;
        curr.completedStatus.canDo.message = 'questioncando field is undefined on this file!';
    } else if (acc.options.updateCanDoField === false) {
        delete curr.completedStatus.canDo;
    }
};

/********************************************************************
 *  splitQuestionName into questionname and passagename
 *********************************************************************/
var splitQuestionName = function (acc, curr) {
    var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
    curr.questionname = pqname.replace(/passage\d+/i, '');
    curr.passagename = pqname.replace(/question\d+/i, '');
    curr.completedStatus.splitField.status = true;
};

/********************************************************************
 * Renames then deletes some keys on the json.
 *********************************************************************/
var deleteKeys = function (acc, curr) {
    curr.passageaudiotranscript = curr.passageaudiofilename;
    curr.questionaudiotranscript = curr.questionaudiofilename;
    delete curr.passageaudiofilename;
    delete curr.questionaudiofilename;
    curr.completedStatus.keyRename.status = true;
};

/********************************************************************
 * Edit passagetext: removeText
 * 
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var replaceText = function (acc, curr, $) {
    if ($('h1').first().text().toLowerCase() === 'instructions' && $('h2').first().text().toLowerCase() === 'warm-up') {
        $('h1').first().nextUntil('h2').add($('h1').first()).add($('h2').first().nextUntil('h2').not($('p').has('strong'))).remove('*');
        $('h2').first().replaceWith('<h2>Definitions</h2>');
        curr.completedStatus.passageDelete.status = true;
    } else {
        curr.completedStatus.passageDelete.status = false;
        curr.completedStatus.passageDelete.message = 'Couldn\'t find (one or both of) <h1>Instructions</h1> or <h2>Warm-up</h2>!';
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
    if ($('h2').first().text().toLowerCase() === 'definitions' && $('h2').last().text().toLowerCase() === 'passage') {
        var pstrong = $('h2').first().nextUntil('h2').filter('p').has('strong');
        var pem = $('h2').first().nextUntil('h2').filter('p').has('em');
        pstrong.addClass('vocab-definition');
        pem.removeClass('vocab-definition');
        pem.addClass('vocab-example');
        curr.completedStatus.passageClass.status = true;
    } else {
        curr.completedStatus.passageClass.status = false;
        curr.completedStatus.passageClass.message = 'Couldn\'t find (one or both of) <h2>Warm-up</h2> or <h2>Passage</h2>';
    }
    
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
        curr.completedStatus.passageDivDefinition.status = true;
    } else {
        curr.completedStatus.passageDivDefinition.status = false;
        curr.completedStatus.passageDivDefinition.message = 'Could not find <h2>Definitions</h2>';
    }
    if ($('h2').last().text().toLowerCase() === 'passage'){
        $('h2').last().nextAll().add($('h2').last()).first().before($('<div class="passage-container">'));
        $('h2').last().nextAll().add($('h2').last()).last().after($('<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>'));
        curr.completedStatus.passageDivPassage.status = true;
    } else {
        curr.completedStatus.passageDivPassage.status = false;
        curr.completedStatus.passageDivPassage.message = 'Could not find <h2>Passage</h2>';
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
        curr.completedStatus.fixCheerioAddCloseDiv.status = true;
    } else {
        curr.completedStatus.fixCheerioAddCloseDiv.status = false;
        curr.completedStatus.fixCheerioAddCloseDiv.message = 'THIS IS IMPORTANT!!!\nThe Following HTML elements likely won\'t have closing <div> tags:\n<div class="definitions-container">\n<div class="passage-container">';
    }
    if (curr.passagetext.includes('</link>')){
        curr.passagetext = curr.passagetext.replace(/<\/link>/g, '');
        curr.completedStatus.fixCheerioRemoveCloseLink.status = true;
    } else {
        curr.completedStatus.fixCheerioRemoveCloseLink.status = false;
        curr.completedStatus.fixCheerioRemoveCloseLink.message = 'Couldn\'t find any </link> to remove!';
    }
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
    curr.completedStatus = {
        splitField: {
            status: false,
            message: ''
        },
        keyRename: {
            status: false,
            message: ''
        },
        passageDelete: {
            status: false,
            message: ''
        },
        passageClass: {
            status: false,
            message: ''
        },
        passageDivDefinition: {
            status: false,
            message: ''
        },
        passageDivPassage: {
            status: false,
            message: ''
        },
        fixCheerioAddCloseDiv: {
            status: false,
            message: ''
        },
        fixCheerioRemoveCloseLink: {
            status: false,
            message: ''
        },
        canDo: {
            status: false,
            message: ''
        }
    };
    updateQuestionCanDo(acc, curr);
    deleteKeys(acc, curr);
    splitQuestionName(acc, curr);
    editPassageText(acc, curr);
    curr.everyTaskSuccessful = Object.keys(curr.completedStatus).every(function(task){
        return curr.completedStatus[task].status;
    });
    curr.thisFileNameIs = acc.currentFile;
    acc.push(curr);
    return acc;
};

/********************************************************************
 * appendErrorLog
 *********************************************************************/
var appendErrorLog = function (reducedCSV) {
    reducedCSV.forEach(row => {
        if (!row.everyTaskSuccessful){
            errorDocument += row.thisFileNameIs + ':\n\t';
            Object.keys(row.completedStatus).forEach(function (task) {
                if (row.completedStatus[task] === false){
                    console.log('Test');
                }
            });
        }
    });
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
        csvrOptions.currentFile = file;
        csvrOptions.updateCanDoField = shouldUpdateCando(file); // update option's updateCanDoField variable
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var outputtedCSV = csvr(csv, csvrOptions, reducer); // Send it through reducer
        var reducedCSV = outputtedCSV.getReducedCSV();
        var csvOutput = outputtedCSV.getFormattedCSV(); // get reduced, formatted csv
        appendErrorLog(reducedCSV);
        writeFile(outputDirectory, file, csvOutput);
        callback(null);
    };
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
    });
}

main();