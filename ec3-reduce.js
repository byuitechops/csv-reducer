/********************************************************************
 * Declare Dependancies
 *********************************************************************/
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
var fileNumber = parseInt(process.argv[2], 10);
if (process.argv[2] === undefined) {
    fileNumber = 0;
}

/********************************************************************
 * Test Files
 *********************************************************************/
const dummyTarget = './csv-tests/countriesDummyData.csv';
const bomRemoval = './csv-tests/bom.txt';

/********************************************************************
 * ec3 Test Files
 *********************************************************************/
const targetDirectory = './csv-tests/ec3/';
const targetFiles = [
    'FP_L1_DE_T11_POC4_V1_CSS.csv',
    'FP_R1_NA_T8_POC4_V1_CSS.csv',
    'FP_S1_NA_T9_POC4_V1_CSS.csv',
    'FP_W1_NE_T5_POC4_V1_CSS.csv'
];

var counter = 0;

var updateCanDoField = false;
if (targetDirectory.indexOf(3) === 'r') {
    console.log(targetDirectory.indexOf(3))
}
//     updateCanDoField = true;
// if (targetFiles[fildeNumber].includes('R') || targetFiles[fileNumber].includes('W')) {
//     console.log('This File Needs to have the can-do field updated.');
// }

/********************************************************************
 * ec3 Outputs
 *********************************************************************/
// Selecting Main File
var targetFile = targetFiles[fileNumber];
// Setting Output File Locationss
var outputDirectory = './csv-tests/ec3/ec3-outputs/';
var outputName = targetFile;

/********************************************************************
 * Start Main Function
 *********************************************************************/
// Read Main File
var csv = fs.readFileSync(targetDirectory + targetFile, 'utf8');

// Declare Options
var csvrOptions = {
    headersOut: [
        'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
        'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename', 'questionname', 'questioncando',
        'questiontext', 'questionlevelfeedback', 'questiontype', 'questionaudiotranscript',
        'answertext1', 'answertext2', 'answertext3', 'answertext4', 'answertext5', 'answertext6'
    ],
    initAcc: [],
    updateCanDoField: updateCanDoField
};

/********************************************************************
 * Updates the Question can-do field from incorrect values.
 *********************************************************************/
var updateQuestionCanDo = function (acc, curr) {
    if (curr.questioncando !== undefined && acc.options.updateCanDoField) { // if questioncando field, 
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
    return curr;
};

/********************************************************************
 *  TODO Redesign the split to use cheerio instead of regex.
 *********************************************************************/
var splitQuestionName = function (acc, curr) {
    var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
    pqname.match(/passage\s*?(\d+)\s*question\s*?(\d+)/g);
    // console.log(pqname);
    curr.questionname = pqname.split(/passage\d+/)[1];
    curr.passagename = pqname.split(/question\d+/)[0];
};

/********************************************************************
 * Renames then deletes some keys on the json.
 *********************************************************************/
var deleteKeys = function (acc, curr) {
    curr.passageaudiotranscript = curr.passageaudiofilename; // change value to new header name
    curr.questionaudiotranscript = curr.questionaudiofilename; // change value to new header name
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
        console.log('HEY IM ABOUT TO LOG A CHEERIO OBJECT!');
        console.dir($('h1')[0].name);
    }
    // "Passage Content to Delete" Section
    // curr.passagetext = curr.passagetext.replace(/<h1>Instructions<\/h1>[\S\s]*?(<h2>Warm-up<\/h2>)/i, /$1/);
    // curr.passagetext = curr.passagetext.replace(/<h2>Warm-up<\/h2>[\S\s]*?(<p><strong>|<h2>Passage<\/h2>)/i, /'$1'/);
    // "Add Divs" Section
}

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


// ModifiedCSV Class Magic
var newcsv = csvr(csv, csvrOptions, reducer);
var csvOutput = newcsv.getFormattedCSV();

// console.log(JSON.stringify(newcsv.getReducedCSV(), null, 4));

// Output File
var outputLocation = outputDirectory + Date.now() + '_' + outputName;
fs.writeFile(outputLocation, csvOutput, function (err) {
    if (err) {
        console.error(err);
    } else {
        console.log('Output file to: ' + outputLocation);
    }
});