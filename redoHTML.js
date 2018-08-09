/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Core Libraries
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
// Read and Write Locations
// const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/R/'; // for production
var targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/I_L/'; // for production
var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
// Error Logs
var batch = ['Reading', 'Listening', 'Writing', 'Speaking'];
var batchNumber = 1; console.log(batch[batchNumber]);
var inferredLandmarksReport = 'Batch|file|row|value|Message\n';
var missingLandmarksReport = 'Batch|file|row|value|Message\n';
var audioFilesLogReport = 'batch|filename|row|value|message\n';
var questioncandoLogReport = 'batch|filename|row|value|message\n';
var passagetexttypeLogReport = 'batch|filename|row|value|message\n';
var temporaryproblemReport = 'batch|filename|row|value|message\n';
// Other Vars
var indexOffset = 2;
var counter = 0;

/********************************************************************
 * reducer -- HTML Stuff -- find landmarks
 *********************************************************************/
var findLandmarks = (acc, curr, arrIndex, $) => {
    var gs = {
        instructions: new Object,
        definitions: new Object,
        passage: new Object,
        pstrong: new Object,
        pem: new Object,
        images: new Object,
        audio: new Object,
    };
    // Find First Instructions Header
    gs.instructions.find = () => {
        var findinstructions;
        var iExists = false;
        findinstructions = $('h1').add('h2').add('h3').filter( (i, ele) => {
            if ( $(ele).text().toLowerCase().includes('instructions') ) {
                null;
            } else if ( $(ele).text().includes('in') && ele.name === 'h1') {
                console.log(`In ${curr.currentfile} on row ${arrIndex+indexOffset} it says ${$(ele).text()}`);
                null;
            } else if (false) {
                null;
            } else {
                null;
            }
        } );
        gs.instructions.object = findinstructions;
        gs.instructions.exists = iExists;
        return findinstructions;
    };
    gs.instructions.find();
    // Find First Warm-up Header, Change it to Definitons Header, 
    gs.definitions.find = () => {
        var finddefinitions;
        var dExists = false;
        finddefinitions = $('').filter( (i, ele) => {
            if (false) {
                null;
            } else if (false) {
                null;
            } else if (false) {
                null;
            } else {
                null;
            }
        } );
        gs.definitions.exists = dExists;
        gs.definitions.object = finddefinitions;
        return finddefinitions;
    };
    gs.definitions.find();
    // Find First Passage Header
    gs.passage.find = () => {
        var findpassage;
        var pExists = false;
        findpassage = $('').filter( (i, ele) => {
            if (false) {
                null;
            } else if (false) {
                null;
            } else if (false) {
                null;
            } else {
                null;
            }
        } );
        gs.passage.object = findpassage;
        gs.passage.exists = pExists;
        return findpassage;
    };
    gs.passage.find();
    // Find all PStrong Tags Inside Definitions Body
    gs.pstrong.find = () => {
        var findpstrong;
        var psExists = false;
        findpstrong = $('').filter( (i, ele) => {
            if (false) {
                null;
            } else if (false) {
                null;
            } else if (false) {
                null;
            } else {
                null;
            }
        } );
        gs.pstrong.object = findpstrong;
        gs.pstrong.exists = psExists;
        return findpstrong;
    };
    gs.pstrong.find();
    // Find all PEM Tags Inside of Definitions Body
    gs.pem.find = () => {
        var findpem;
        var peExists = false;
        findpem = gs.pstrong.object.has('em').filter( (i, ele) => {
            if (false) {
                null;
            } else if (false) {
                null;
            } else if (false) {
                null;
            } else {
                null;
            }
        } );
        gs.pem.object = findpem;
        gs.pem.exists = peExists;
        return findpem;
    };
    gs.pem.find();
    // Find all Images
    gs.images.find = () => {
        var findimages;
        var imgExists = false;
        if ($('img').length > 0) {
            findimages = $('img');
            imgExists = true;
        }
        gs.images.object = findimages;
        gs.images.exists = imgExists;
        return findimages;
    };
    gs.images.find();
    // Find all Audio Tags
    gs.audio.find = () => {
        var findaudio;
        var aExists = false;
        if ($('audio').length > 0) {
            findaudio = $('audio');
            aExists = true;
        }
        gs.audio.object = findaudio;
        gs.audio.exists = aExists;
        return findaudio;
    };
    gs.audio.find();

    return gs;
};

/********************************************************************
 * reducer -- HTML Stuff -- replace html
 *********************************************************************/
var replaceHTML = (acc, curr, arrIndex, $, gs) => {
    // Remove Images
    // Replace Audio Tags
    // Delete everything between gs.instructions and gs.definitions or gs.passage
};
/********************************************************************
 * reducer -- HTML Stuff -- add divs
 *********************************************************************/
var addDivs = (acc, curr, arrIndex, $, gs) => {
    // find body sections then wrap
};
/********************************************************************
 * reducer -- HTML Stuff -- add classes
 *********************************************************************/
var addClasses = (acc, curr, arrIndex, $, gs) => {
    // look inside definitions body section then add classes to qualified elements
};
/********************************************************************
 * reducer -- HTML Stuff -- fix cheerio
 *********************************************************************/
var fixCheerio = (acc, curr, arrIndex, $, gs) => {
    // Take out html, header, and body, 
};





/********************************************************************
 * reducer -- HTML Stuff -- main
 *********************************************************************/
var editPassageText = function (acc, curr, arrIndex) {
    var $ = cheerio.load(curr.passagetext);
    var gs = findLandmarks(acc, curr, arrIndex, $);
    replaceHTML (acc, curr, arrIndex, $, gs);
    addDivs (acc, curr, arrIndex, $, gs);
    addClasses (acc, curr, arrIndex, $, gs);
    fixCheerio (acc, curr, arrIndex, $, gs);
};







/********************************************************************
 * reducer -- Main
 *********************************************************************/
var reducer = function (acc, curr, i) {
    curr.currentfile = acc.options.currentfile;
    // TODO Fix Cando
    // TODO Rename Keys
    // TODO Split Question Name
    // TODO Verify Passage Text Type Field
    // TODO Verifty Question Type Field
    // TODO Edit Passage Text
    editPassageText(acc, curr, i);
    acc.push(curr);
    return acc;
};

/********************************************************************
 * read in a list of files to 
 *********************************************************************/
var getTargetFiles = function (targetDirectory) {
    var filesInDirectory = fs.readdirSync(targetDirectory);
    var desiredFilesOnly = filesInDirectory.reduce(function (acc, curr) {
        if (curr.slice(-4) === '.csv') {
            acc.push(curr);
        }
        return acc;
    }, []);
    console.log(desiredFilesOnly.length);
    return desiredFilesOnly;
};

var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = outputDirectory + outputName;
    fs.writeFileSync(outputLocation, dataToOutput, function (err) {
        if (err) console.error(err);
        else console.log('Output file to: ' + outputLocation);
    });
};

var printReportLogs = () => {
    // writeFile(od_foundErrors, '__errorLog.txt', errorDocument); // Write Error-Log Document
    writeFile(od_foundErrors, 'audio-file-Report.csv', audioFilesLogReport); // A record of all
    writeFile(od_foundErrors, 'questioncando-Report.csv', questioncandoLogReport); // A record of all
    writeFile(od_foundErrors, 'passage-text-type-Report.csv', passagetexttypeLogReport); // A record of all
    writeFile(od_foundErrors, 'missing-html-landmarks-Report.csv', missingLandmarksReport); // A record of all
    writeFile(od_foundErrors, 'inferred-html-landmarks-Report.csv', inferredLandmarksReport); // A record of all
    writeFile(od_foundErrors, 'temporary-problem-Report.csv', temporaryproblemReport); // A record of all
};

/********************************************************************
 * main 
 *********************************************************************/
(function main () {
    var targetFiles = getTargetFiles(targetDirectory);
    var csvrOptions = { // Set Options:
        headersOut: [
            'id', 'skill', 'level', 'topic', 'difficultylevel', 'function', 'passagetext',
            'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename',
            'questionname', 'questioncando', 'questiontext', 'questionlevelfeedback',
            'questiontype', 'questionaudiotranscript', 'answertext1', 'answertext2',
            'answertext3', 'answertext4', 'answertext5', 'answertext6', 'audiofilelink1',
            'audiofilelink2'
        ],
        initAcc: [],
        updateCanDoField: false,
    };
    targetFiles.forEach( (file) => {
        csvrOptions.currentfile = file;
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var csvProcessor = csvr(csv, csvrOptions, reducer);
    } );
    // printReportLogs();
})();
