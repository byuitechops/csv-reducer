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
        console.log(filename + 'needs to have cando updated.');
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
    curr.questionname = pqname.replace(/passage\d+/, '');
    curr.passagename = pqname.replace(/question\d+/, '');
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
 * Edit passagetext
 *********************************************************************/
var editPassageText = function (acc, curr) {
    // "Adding Class Definitions and Examples"
    var $ = cheerio.load(curr.passagetext);
    if (counter < 1) {
        counter++;
        // console.log('HEY IM ABOUT TO LOG A CHEERIO OBJECT!');
        // console.log($('h2').nextUntil('h2').filter('p').text());
    } // ^^ Practice more with cheerio until I can find what Im looking for.
    // "Passage Content to Delete" Section
    // "Add Divs" Section
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