/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Core Libraries
const dsv = require('d3-dsv');
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
// Read and Write Locations
var bl = ['R','L','W','S','A']; // Batch Letter
if (process.argv[2] === undefined || isNaN(parseInt(process.argv[2], 10)) || process.argv[2] >= bl.length || process.argv[2] < 0) {
    process.exit(console.log(`In order to commense the program, enter a number between 0 and ${bl.length-1}`));
} else {
    var bn = process.argv[2]; // Batch Number
}
// const targetDirectory = `./csv-tests/ec3/ec3-production/ec3-csvs-originals/${bl[bn]}/`; // for production
var targetDirectory = `./csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/I_${bl[bn]}/`; // for production
var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/'; // for production
var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
var od_reports = './reports/'; // for production
// Error Logs
var batchArr = ['Reading', 'Listening', 'Writing', 'Speaking', 'All'];
var batch = batchArr[bn];
console.log(batch);
var inferredLandmarksReport = 'batch|file|row|value|severity|Message\n';
var missingLandmarksReport = 'batch|file|row|value|severity|Message\n';
var audioFilesLogReport = 'batch|filename|row|value|severity|message\n';
var questioncandoLogReport = 'batch|filename|row|value|severity|message\n';
var passagetexttypeLogReport = 'batch|filename|row|value|severity|message\n';
var fixmeReport = 'batch|filename|row|value|severity|message\n';
//  tempReport Template:::: tempReport += `${uniqueID()}|${curr.currentfile}|${arrIndex+indexOffset}|false|false|false|false\n`;
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
        vocabulary: new Object,
        instructionsBody: new Object,
        definitionsBody: new Object,
        passageBody: new Object,
        images: new Object,
        audio: new Object,
    };
    // Find First Instructions Header
    gs.instructions.find = () => {
        var findinstructions;
        var iExists = false;
        findinstructions = $('h1').add('h2').add('h3').filter( (i, ele) => {
            if ( $(ele).text().toLowerCase().includes('instructions') && ele.name === 'h1') {
                iExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('instructions')) {
                iExists = true;
                return $(ele);
            } else if ( $(ele).text().toLowerCase().includes('in') && ele.name === 'h1') {
                iExists = true;
                return $(ele);
            } else if (ele.name === 'h1') {
                fixmeReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${$(ele).text()}|WARNING|It looks like some information is mis-tagged with an H1 tag.\n`;
                null;
            }
        } ).first();
        gs.instructions.object = findinstructions;
        gs.instructions.exists = iExists;
        return findinstructions;
    };
    gs.instructions.find();
    // Find First Warm-up Header, Change it to Definitons Header, 
    gs.definitions.find = () => {
        var findwarmup;
        var wExists = false;
        var finddefinitions;
        var dExists = false;
        // TODO Try to see if <h2>Definitions</h2> already exists
        findwarmup = $('h2').add('h1').add('h3').add('h4').filter( (i, ele) => {
            if ($(ele).text().toLowerCase().includes('definitions') && ele.name === 'h2') {
                console.log(`In ${curr.currentfile} on row ${arrIndex + indexOffset} it says `.padEnd(65, '.') + `${$(ele).text()}`);
            } else if ( $(ele).text().toLowerCase().includes('warm-up') && ele.name === 'h2') {
                wExists = true;
                return $(ele);
            } else if ( $(ele).text().toLowerCase().includes('warm') && $(ele).text().toLowerCase().includes('up') && ele.name === 'h2') {
                wExists = true;
                return $(ele);
            } else if ( $(ele).text().toLowerCase().includes('warm-up') ) {
                wExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('warm-u p') || $(ele).text().toLowerCase().includes('wam-up')) {
                wExists = true;
                return $(ele);
                // fixmeReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${$(ele).text()}|WARNING|It looks like Warm-up is misspelled.\n`;
            }
        } ).first();
        if (!wExists) {
            dExists = false;
        } else if (wExists) {
            var newDefinitions = $('<h2>Definitions</h2>');
            findwarmup.before(newDefinitions);
            finddefinitions = $('h2').filter( (i, ele) => {
                if ($(ele).text() === 'Definitions') {
                    dExists = true;
                    return $(ele);
                }
            }).first();
            if (wExists && !dExists) console.error(`In ${curr.currentfile} on row ${arrIndex+indexOffset} warm-up existed, but definitions did not!!!`);
            findwarmup.remove();
        }
        gs.definitions.exists = dExists;
        gs.definitions.object = finddefinitions;
        return finddefinitions;
    };
    gs.definitions.find();
    // Find First Passage Header
    gs.passage.find = () => {
        var findpassage;
        var pExists = false;
        findpassage = $('h2').add('h1').add('h3').filter( (i, ele) => {
            if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h2') {
                $(ele).html('Passage'); // Not all passages innerHTML are the same. This line make them the same.
                pExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('pas') && $(ele).text().toLowerCase().includes('age') && ele.name === 'h2') {
                $(ele).html('Passage');
                pExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('passage')) {
                $(ele).html('Passage');
                pExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('practice')) {
                // Don't let this scenario conform
                pExists = true;
                return $(ele);
            }
        }); 
        gs.passage.object = findpassage;
        gs.passage.exists = pExists;
        return findpassage;
    };
    gs.passage.find();
    // Find all PStrong Tags Inside Definitions Body
    gs.vocabulary.find = () => {
        var findvocabulary;
        var vExists = false;
        var regexForDefinitions = RegExp(/\(\w{1,4}\)/);
        var regexForExamples = RegExp(/^\s*?example\s*?/);
        findvocabulary = $(gs.definitions.object).nextUntil(gs.passage.object).has('strong').filter( (i, ele) => {
            if (ele.name === 'p' && regexForDefinitions.test($(ele).text()) && !$(ele).text().toLowerCase().includes('(over)') && !$(ele).text().toLowerCase().includes('(men)')) {
                $(ele).addClass('vocab-definition');
                vExists = true;
                return $(ele);
            } else if (ele.name === 'p' && regexForExamples.test( $(ele).text() ) ) {
                console.log(`In ${curr.currentfile} on row ${arrIndex + indexOffset} it says`.padEnd(80, '.') + `${$(ele).html()}`);
                $(ele).addClass('vocab-example');
                vExists = true;
                return $(ele);
            }
        } );
        // if (!vExists) console.log(`In ${curr.currentfile} on row ${arrIndex + indexOffset} it says vocabulary doesn't exist`.padEnd(80, '.') + `\n${$('*').html()}\n`);
        gs.vocabulary.object = findvocabulary;
        gs.vocabulary.exists = vExists;
        return findvocabulary;
    };
    gs.vocabulary.find();
    // TODO check to see if definitions was found. If not, try to guess where it should go based on the pstrong and pem
    if (!gs.definitions.exists && gs.vocabulary.exists) {
        console.log(counter++);
        var newDefinitions = $('<h2>Definitions</h2>');
        gs.vocabulary.object.first().before(newDefinitions);
        gs.definitions.find();
    }
    // TODO Select Whole Instructions Section
    // gs.instructionsBody.find = () => {};
    // TODO Select Whole Definitions Section
    // gs.definitionsBody.find = () => {};
    // TODO Select Whole Passage Section
    // gs.passageBody.find = () => {};
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
    // TODO When Definitions and Passage don't exists, log when "" ocurrs and then make sure it is added to the instructions section to be removed
    
    (() => {
        var checkerOpts = ['instructions', 'definitions', 'vocabulary', 'passage'];
        var checker = checkerOpts[2];
        if (!gs[checker].exists) {
            // console.log(`In ${curr.currentfile} on row ${arrIndex + indexOffset} it says ${checker} doesn't exist`.padEnd(80, '.') + `\n${$('*').html()}\n`);
        }
        if (!gs.instructions.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|instructions|WARNING|It looks like there is no Instructions Tag on this row!\n`;
        if (!gs.definitions.exists && !gs.vocabulary.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|definitions and vocabulary|WARNING|It looks like there is no Warm-up Landmark on this row!\n`;
        else if (!gs.definitions.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|definitions|WARNING|It looks like there is no Warm-up Landmark on this row!\n`;
        else if (!gs.vocabulary.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|vocabulary|WARNING|It looks like there is no vocabulary items on this row!\n`;
        if (!gs.passage.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|passage|WARNING|It looks like there is no Passage Landmark on this row!\n`;
    })();
    
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
    fixCheerio (acc, curr, arrIndex, $, gs);
};






/********************************************************************
 * reducer -- Fix Cando
 *********************************************************************/
var fixQuestionCando = (acc, curr, arrIndex) => {
    var lowerFilename = curr.currentfile.toLowerCase();
    var shouldUpdateCando = lowerFilename[3] === 'r' || lowerFilename[3] === 'w';
    if (curr.questioncando !== undefined && !curr.questioncando.toLowerCase().includes('f') && curr.questioncando !== '') {
        questioncandoLogReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${curr.questioncando}|NOTE: This value was changed from "${curr.questioncando}" to "".\n`;
        curr.questioncando = '';
    } // Below needs to be separate from the above if statement.
    if (curr.questioncando !== undefined && shouldUpdateCando && curr.questioncando !== '') {
        if      (curr.questioncando === 'f9') curr.questioncando = 'f10'; // f9 to f10
        else if (curr.questioncando === 'f10') curr.questioncando = 'f11'; // f10 to f11
        else if (curr.questioncando === 'f11') curr.questioncando = 'f9'; // f11 to f9
        else if (curr.questioncando === 'f31') curr.questioncando = 'f30'; // f31 to f30
    }
};

// TODO Create Error Report for this Function
/********************************************************************
 * reducer -- rename keys
 *********************************************************************/
var renameKeys = (acc, curr, arrIndex) => {
    if (curr.questionname !== undefined && curr.questionname !== '') {
        var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
        curr.questionname = pqname.replace(/passage\d+/i, '');
        curr.passagename = pqname.replace(/question\d+/i, '');
        curr.completedStatus.splitField.status = true;
    } 
};

// TODO Transfer Code into this function
/********************************************************************
 * reducer -- split questionname
 *********************************************************************/
var splitQuestionName = (acc, curr, arrIndex) => {

};

// TODO Transfer Code into this function
/********************************************************************
 * reducer -- verify passagetexttype
 *********************************************************************/
var verifyPassageTextType = (acc, curr, arrIndex) => {

};

// TODO Transfer Code into this function
/********************************************************************
 * reducer -- verify questiontype
 *********************************************************************/
var verifyQuestionType = (acc, curr, arrIndex) => {

};




/********************************************************************
 * reducer -- Main
 *********************************************************************/
var reducer = function (acc, curr, i) {
    curr.currentfile = acc.options.currentfile;
    fixQuestionCando(acc, curr, i);
    renameKeys(acc, curr, i);
    splitQuestionName(acc, curr, i);
    verifyPassageTextType(acc, curr, i);
    verifyQuestionType(acc, curr, i);
    // TODO Finish editPassageText
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

/********************************************************************
 * main -- foreach -- set new file name 
 *********************************************************************/
var setNewFileName = function (originalFileName) {
    var newFileName = originalFileName.replace(/(\w\w_\w\d_\w\w_\w\d+).*/, `${/$1/}_FA18.csv`);
    newFileName = newFileName.replace(/\//g, '');
    return newFileName;
};

/********************************************************************
 * main / print report logs -- write file
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = outputDirectory + outputName;
    fs.writeFileSync(outputLocation, dataToOutput, function (err) {
        if (err) console.error(err);
        else console.log('Output file to: ' + outputLocation);
    });
};

/********************************************************************
 * main -- print report logs
 *********************************************************************/
var printReportLogs = () => {
    // writeFile(od_foundErrors, '__errorLog.txt', errorDocument); // Write Error-Log Document
    writeFile(od_reports, 'audio-file-Report.csv', audioFilesLogReport); // A record of all
    writeFile(od_reports, 'questioncando-Report.csv', questioncandoLogReport); // A record of all
    writeFile(od_reports, 'passage-text-type-Report.csv', passagetexttypeLogReport); // A record of all
    writeFile(od_reports, 'missing-html-landmarks-Report.csv', missingLandmarksReport); // A record of all
    writeFile(od_reports, 'inferred-html-landmarks-Report.csv', inferredLandmarksReport); // A record of all
    writeFile(od_reports, 'fixme-Report.csv', fixmeReport); // A record of all
};

/********************************************************************
 * main -- main 
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
        var newFileName = setNewFileName(file);
        // writeFile(od_noErrors, newFileName, csvProcessor.getFormattedCSV()); // Write the File
    } );
    printReportLogs();
})();
