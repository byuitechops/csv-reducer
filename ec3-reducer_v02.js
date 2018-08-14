/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Core Libraries
const dsv = require('d3-dsv');
const fs = require('fs');
const path = require('path');
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
var inferredLandmarksReport = 'batch|file|row|value|severity|message\n';
var missingLandmarksReport = 'batch|file|row|value|severity|message\n';
var imageTagsReport = 'batch|filename|row|value|severity|message\n';
var audioFilesLogReport = 'batch|filename|row|value|severity|message\n';
var questioncandoLogReport = 'batch|filename|row|value|severity|message\n';
var passagetexttypeLogReport = 'batch|filename|row|value|severity|message\n';
var fixmeReport = 'batch|filename|row|value|severity|message\n';
// Other Vars
var uniqueStringForAudioTags = '<div class="replaceaudio">[[Replace audio file here filename.mp3]]</div>';
var indexOffset = 2;
var counter = 0;
var globalTemporaryVar;



/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find instructions
 *********************************************************************/
var findInstructions = (acc, curr, arrIndex, $, gs) => {
    var instructions = {
        object: new Object,
        exists: false
    };
    instructions.object = $('h1').add('h2').add('h3').filter((i, ele) => {
        if ($(ele).text().toLowerCase().includes('instructions') && ele.name === 'h1') {
            instructions.exists = true;
            return $(ele);
        } else if ($(ele).text().toLowerCase().includes('instructions')) {
            instructions.exists = true;
            return $(ele);
        } else if ($(ele).text().toLowerCase().includes('in') && ele.name === 'h1') {
            instructions.exists = true;
            return $(ele);
        } else if (ele.name === 'h1') {
            fixmeReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${$(ele).text()}|WARNING|It looks like some information is mis-tagged with an H1 tag.\n`;
            null;
        }
    }).first();
    return instructions;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find definitions
 *********************************************************************/
var findDefinitions = (acc, curr, arrIndex, $, gs) => {
    var definitions = {
        object: new Object,
        exists: false
    };
    definitions.object = $('h2').filter( (i, ele) => {
        if ($(ele).text().toLowerCase() === 'definitions' && ele.name === 'h2') {
            definitions.exists = true;
            return $(ele);
        }
    }).first();
    if (definitions.exists === false) {
        var findwarmup;
        var wExists = false;
        // This is broken up into multiple if/else statements for readability, but can all be put on one line as long as order is kept.
        findwarmup = $('h2').add('h1').add('h3').add('h4').filter((i, ele) => {
            if ($(ele).text().toLowerCase().includes('warm-up') && ele.name === 'h2') { // prefered checking method
                wExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('warm') && $(ele).text().toLowerCase().includes('up') && ele.name === 'h2') { // back-up checking method
                wExists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('warm-up') || $(ele).text().toLowerCase().includes('warm-u p') || $(ele).text().toLowerCase().includes('wam-up')) { // Anything else weird
                wExists = true;
                return $(ele);
            }
        }).first();
        if (!wExists) {
            definitions.exists = false;
        } else if (wExists) {
            var newDefinitions = $('<h2>Definitions</h2>');
            findwarmup.before(newDefinitions);
            definitions.object = $('h2').filter((i, ele) => {
                if ($(ele).text() === 'Definitions') {
                    definitions.exists = true;
                    return $(ele);
                }
            }).first();
            if (wExists && !definitions.exists) console.error(`In ${curr.currentfile} on row ${arrIndex+indexOffset} warm-up existed, but definitions did not!!!`);
            findwarmup.remove();
        }
    }
    return definitions;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find passage
 *********************************************************************/
var findPassage = (acc, curr, arrIndex, $, gs) => {
    var passage = {
        object: new Object,
        exists: false
    };
    passage.object = $('h2').add('h1').add('h3').filter((i, ele) => {
        if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h2') {
            $(ele).html('Passage'); // Not all passages innerHTML are the same. This line make them the same.
            passage.exists = true;
            return $(ele);
        } else if ($(ele).text().toLowerCase().includes('pas') && $(ele).text().toLowerCase().includes('age') && ele.name === 'h2') {
            $(ele).html('Passage');
            passage.exists = true;
            return $(ele);
        } else if ($(ele).text().toLowerCase().includes('passage')) {
            $(ele).html('Passage');
            passage.exists = true;
            return $(ele);
        } else if ($(ele).text().toLowerCase().includes('practice')) {
            // Don't let this scenario conform
            passage.exists = true;
            return $(ele);
        }
    }).first();
    return passage;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find vocabulary
 *********************************************************************/
var findVocabulary = (acc, curr, arrIndex, $, gs) => {
    var vocabulary = {
        object: new Object,
        exists: false,
        inference: {
            used: false,
            option: 0
        }
    };
    var regexForDefinitions = RegExp(/\(\w{1,4}\)/);
    var regexForExamples = RegExp(/^\s*?example\s*?/);
    var vocabFilter = function (i, ele) {
        if (ele.name === 'p' && regexForDefinitions.test($(ele).text()) && !$(ele).text().toLowerCase().includes('(over)') && !$(ele).text().toLowerCase().includes('(men)')) {
            $(ele).addClass('vocab-definition');
            vocabulary.exists = true;
            return $(ele);
        } else if (ele.name === 'p' && regexForExamples.test($(ele).text())) {
            $(ele).addClass('vocab-example');
            vocabulary.exists = true;
            return $(ele);
        }
    };
    if (gs.definitions.exists && gs.passage.exists) { // First Preference: Use Definitions and Passage as Landmarks to search for vocabulary words
        vocabulary.object = $(gs.definitions.object).nextUntil(gs.passage.object).filter('p').has('strong').filter(vocabFilter);
    } else if (gs.instructions.exists && !gs.definitions.exists && gs.passage.exists) { // Secondary Preference: Use Instructions and Passage as Landmarks
        vocabulary.object = $(gs.instructions.object).nextUntil(gs.passage.object).filter('p').has('strong').filter(vocabFilter);
        vocabulary.inference.used = true;
        vocabulary.inference.option = 1;
    } else if (gs.definitions.exists && !gs.passage.exists) { // Third Preference: Use Definitions and go to end of document
        vocabulary.object = $(gs.definitions.object).nextAll().filter('p').has('strong').filter(vocabFilter);
        vocabulary.inference.used = true;
        vocabulary.inference.option = 2;
    } else if (gs.instructions.exists && !gs.definitions.exists && !gs.passage.exists) { // Fourth Preference: Use Instructions and go to end of the document
        vocabulary.object = $(gs.instructions.object).nextAll().filter('p').has('strong').filter(vocabFilter);
        vocabulary.inference.used = true;
        vocabulary.inference.option = 3;
    } else if (!gs.instructions.exists && !gs.definitions.exists && !gs.passage.exists) { // Last Preference: Search the Whole Document
        vocabulary.object = $('body').children().filter('p').has('strong').filter(vocabFilter);
        vocabulary.inference.used = true;
        vocabulary.inference.option = 4;
    }
    if (vocabulary.exists && vocabulary.inference.used) {
        inferredLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|Vocabulary and Examples (${vocabulary.inference.option}/4)|NOTE|This Set of Vocabulary and Examples was found using programmatic inference of increasing casualty (Scaled from 1-4. 4 being most casual.)\n`;
    }
    // if (!vocabulary.exists) console.log(`In ${curr.currentfile} on row ${arrIndex + indexOffset} it says vocabulary doesn't exist`.padEnd(80, '.') + `\n${$.html()}\n`);
    return vocabulary;
};
// TODO Finish this Function
/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find instructions body
 *********************************************************************/
var findInstructionsBody = (acc, curr, arrIndex, $, gs) => {
    var instructionsBody = {
        object: new Object,
        exists: false,
        inference: {
            used: false,
            option: 0
        }
    };
    if (gs.instructions.exists && gs.definitions.exists) { // First Preference: Instructions down to Warm-Up
        instructionsBody.object = gs.instructions.object.add(gs.instructions.object.nextUntil(gs.definitions.object));
        instructionsBody.exists = true;
    } else if (gs.instructions.exists && !gs.definitions.exists && gs.passage.exists) { // Second Preference: Instructions down to Passage
        instructionsBody.object = gs.instructions.object.add( gs.instructions.object.nextUntil(gs.passage.object) );
        instructionsBody.exists = true;
        instructionsBody.inference.used = true;
        instructionsBody.inference.option = 1;
    } else if (gs.instructions.exists && !gs.definitions.exists && !gs.passage.exists) { // Third Preference: Instructions down to End of Document
        instructionsBody.object = gs.instructions.object.add( gs.instructions.object.nextAll() );
        instructionsBody.exists = true;
        instructionsBody.inference.used = true;
        instructionsBody.inference.option = 2;
    } else if (!gs.instructions.exists && gs.definitions.exists) { // Fourth Preference: Defintions up to Links
        instructionsBody.object = gs.definitions.object.prevUntil('link');
        instructionsBody.exists = true;
        instructionsBody.inference.used = true;
        instructionsBody.inference.option = 3;
    } else if (!gs.instructions.exists && !gs.definitions.exists && gs.passage.exists) { // Fifth Preference: Passage up to Links
        instructionsBody.object = gs.passage.object.prevUntil('link');
        instructionsBody.exists = true;
        instructionsBody.inference.used = true;
        instructionsBody.inference.option = 4;
    } else if (!gs.instructions.exists && !gs.definitions.exists && !gs.passage.exists) { // Sixth Preference: Links down to End of Document
        instructionsBody.object = $('link').last().nextAll();
        instructionsBody.exists = true;
        instructionsBody.inference.used = true;
        instructionsBody.inference.option = 5;
    }
    if ( instructionsBody.exists && instructionsBody.inference.used ) {
        inferredLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|Instructions Body (${instructionsBody.inference.option}/5)|NOTE|The instructions body section was found using programmatic inference of increasing casualty (Scaled from 1-5. 5 being most casual).\n`;
    }
    return instructionsBody;
};
// TODO Finish this Function
/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find definitions body
 *********************************************************************/
var findDefinitionsBody = (acc, curr, arrIndex, $, gs) => {
    var definitionsBody = {
        object: new Object,
        exists: false,
        inference: {
            used: false,
            option: 0
        }
    };
    if (gs.definitions.exists) {
        if (gs.passage.exists) { // First Preference: Definitions down to Passage
            definitionsBody.object = gs.definitions.object.add(gs.definitions.object.nextUntil(gs.passage.object));
            definitionsBody.exists = true;
        } else if (gs.vocabulary.exists) { // Second Preference: Definitions down to End of Vocabulary
            definitionsBody.object = gs.definitions.object.add(gs.definitions.object.nextUntil(gs.vocabulary.object.last()).add(gs.vocabulary.object.last()));
            definitionsBody.exists = true;
            definitionsBody.inference.used = true;
            definitionsBody.inference.option = 1;
        } else if (!gs.passage.exists) { // Third Preference: Definitions down to End of Document
            definitionsBody.object = gs.definitions.object.nextAll(); // According to tests, this shouldn't have to run, but it's here just in case.
            definitionsBody.exists = true;
            definitionsBody.inference.used = true;
            definitionsBody.inference.option = 2;
        } else {
            console.error(`In ${curr.currentfile} on row ${arrIndex+indexOffset} in the findDefinitionsBody function, there is an exception:\n${$.html()}\n`);
        }
    }
    if (definitionsBody.exists && definitionsBody.inference.used) {
        inferredLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|Definitions Body (${definitionsBody.inference.option}/2)|NOTE|The definitions body section was found using programmatic inference of increasing casualty (Scaled from 1-2. 2 being most casual).\n`;
    }
    return definitionsBody;
};
// TODO Finish this Function
/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find definitions body
 *********************************************************************/
var findPassageBody = (acc, curr, arrIndex, $, gs) => {
    var passageBody = {
        object: new Object,
        exists: false,
        inference: {
            used: false,
            option: 0
        }
    };
    if (gs.passage.exists) { // First Preference: Passage down to End of Document
        passageBody.object = gs.passage.object.add(gs.passage.object.nextAll());
        passageBody.exists = true;
    } else if (!gs.passage.exists && gs.definitionsBody.exists) { // Second Preference: End of Document up to end of definitionsBody
        passageBody.object = gs.definitionsBody.object.last().nextAll().remove(gs.definitionsBody.object.last());
        passageBody.exists = true;
        passageBody.inference.used = true;
        passageBody.inference.option = 1;
    } else if (!gs.passage.exists && !gs.definitionsBody.exists && gs.instructionsBody.exists) { // Third Preference: End of instructions down to end of document
        passageBody.object = gs.instructionsBody.object.last().nextAll().remove(gs.instructionsBody.object.last());
        passageBody.exists = true;
        passageBody.inference.used = true;
        passageBody.inference.option = 2;
        null;
    }
    if (passageBody.exists && passageBody.inference.used) {
        inferredLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|Passage Body (${passageBody.inference.option}/2)|NOTE|The passage body section was found using programmatic inference of increasing casualty (Scaled from 1-2. 2 being most casual).\n`;
    }
    return passageBody;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find image tags
 *********************************************************************/
var findImageTags = (acc, curr, arrIndex, $, gs) => {
    var imageTags = {
        object: new Object,
        exists: false
    };
    imageTags.object = $('img');
    if ($(imageTags.object.length > 0)) {
        imageTags.exists = true;
    }
    return imageTags;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks -- find audio tags
 *********************************************************************/
var findAudioTags = (acc, curr, arrIndex, $, gs) => {
    var audioTags = {
        object: new Object,
        exists: false
    };
    audioTags.object = $('audio');
    if (audioTags.object.length > 0) {
        audioTags.exists = true;
    }
    return audioTags;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- find landmarks
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
        var instructions = findInstructions(acc, curr, arrIndex, $, gs);
        gs.instructions.object = instructions.object;
        gs.instructions.exists = instructions.exists;
        return instructions.object;
    };
    gs.instructions.find();
    // Find First Warm-up Header, Change it to Definitons Header, 
    gs.definitions.find = () => {
        var definitions = findDefinitions(acc, curr, arrIndex, $, gs);
        gs.definitions.exists = definitions.exists;
        gs.definitions.object = definitions.object;
        return definitions.object;
    };
    gs.definitions.find();
    // Find First Passage Header
    gs.passage.find = () => {
        var passage = findPassage(acc, curr, arrIndex, $, gs);
        gs.passage.object = passage.object;
        gs.passage.exists = passage.exists;
        return passage.object;
    };
    gs.passage.find();
    // Find all PStrong Tags Inside Definitions Body
    gs.vocabulary.find = () => {
        var vocabulary = findVocabulary(acc, curr, arrIndex, $, gs);
        gs.vocabulary.object = vocabulary.object;
        gs.vocabulary.exists = vocabulary.exists;
        return vocabulary.object;
    };
    gs.vocabulary.find();
    // Check to see if definitions was found. If not, try to guess where it should go based on where the vocabulary is
    if (!gs.definitions.exists && gs.vocabulary.exists) {
        var newDefinitions = $('<h2>Definitions</h2>');
        gs.vocabulary.object.first().before(newDefinitions);
        gs.definitions.find();
        if (gs.definitions.exists) {
            inferredLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|Definitions Header (1/1)|NOTE|This Definitions Header was implemented using programmatic inference based on vocabulary and example landmarks.\n`;
        }
    }
    // Select Whole Instructions Section
    gs.instructionsBody.find = () => {
        var instructionsBody = findInstructionsBody(acc, curr, arrIndex, $, gs);
        gs.instructionsBody.exists = instructionsBody.exists;
        gs.instructionsBody.object = instructionsBody.object;
        return instructionsBody.object;
    };
    gs.instructions.find();
    // Select Whole Definitions Section
    gs.definitionsBody.find = () => {
        var definitionsBody = findDefinitionsBody(acc, curr, arrIndex, $, gs);
        gs.definitionsBody.exists = definitionsBody.exists;
        gs.definitionsBody.object = definitionsBody.object;
        return definitionsBody.object;
    };
    gs.definitionsBody.find();
    // Select Whole Passage Section
    gs.passageBody.find = () => {
        var passageBody = findPassageBody(acc, curr, arrIndex, $, gs);
        gs.passageBody.exists = passageBody.exists;
        gs.passageBody.object = passageBody.object;
        return passageBody.object;
    };
    gs.passageBody.find();
    // Find all Images
    gs.images.find = () => {
        var images = findImageTags(acc, curr, arrIndex, $, gs);
        gs.images.object = images.object;
        gs.images.exists = images.exists;
        return images.object;
    };
    gs.images.find();
    // Find all Audio Tags
    gs.audio.find = () => {
        var audio = findAudioTags(acc, curr, arrIndex, $, gs);
        gs.audio.object = audio.object;
        gs.audio.exists = audio.exists;
        return audio.object;
    };
    gs.audio.find();
    // TODO When Definitions and Passage don't exists, log when "Write a repsone to each of the prompts below." ocurrs and then make sure it is added to the instructions section to be removed
    (() => {
        if (!gs.instructions.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|instructions|WARNING|It looks like there is no Instructions Tag on this row!\n`;
        if (!gs.definitions.exists && !gs.vocabulary.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|definitions and vocabulary|WARNING|It looks like there is no Definitions and Vocabulary section on this row!\n`;
        else if (!gs.definitions.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|definitions|WARNING|It looks like there is no Warm-up Landmark on this row!\n`;
        else if (!gs.vocabulary.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|vocabulary|WARNING|It looks like there is no vocabulary items on this row!\n`;
        if (!gs.passage.exists) missingLandmarksReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|passage|WARNING|It looks like there is no Passage Landmark on this row!\n`;
    })();
    
    return gs;
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- removeImages
 *********************************************************************/
var removeImages = (acc, curr, arrIndex, $, gs) => {
    var imageTags = gs.images.object;
    if (imageTags !== undefined) {
        imageTags.filter((i, ele) => {
            imageTagsReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${$(ele).attr('src')}|NOTE|${i+1}/${imageTags.length} images removed on this file.\n`;
        });
        imageTags.remove();
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- remove audio tags
 *********************************************************************/
var replaceAudio = (acc, curr, arrIndex, $, gs) => {
    // Select Audio Tags, cycle through each one, record their data, then delete
    var audioTags = gs.audio.object;
    if (audioTags !== undefined) {
        if (audioTags.length === 2) {
            curr.audiofilelink1 = audioTags.first().attr('src');
            curr.audiofilelink2 = audioTags.last().attr('src');
            audioFilesLogReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${curr.audiofilelink1}|NOTE|Success! This file has two audio tags! (This is 1/${audioTags.length}\n`;
            audioFilesLogReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${curr.audiofilelink2}|NOTE|Success! This file has two audio tags! (This is 2/${audioTags.length}\n`;
            audioTags.first().replaceWith(uniqueStringForAudioTags);
            audioTags.last().replaceWith(uniqueStringForAudioTags);
        } else if (audioTags.length === 1) {
            var audioSrc = audioTags.attr('src');
            audioFilesLogReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${audioSrc}|NOTE|Success! This file has one audio tag.\n`;
            audioTags.replaceWith(uniqueStringForAudioTags);
        } else if (audioTags.length > 2) {
            audioTags.filter( (i, ele) => {
                audioFilesLogReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${$(ele).attr('src')}|ERR0R|Unable to edit. There were more than two audio tags in this file! (This is ${i+1}/${audioTags.length}\n`;
            });
        }
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- remove instructions section
 *********************************************************************/
var removeInstructions = (acc, curr, arrIndex, $, gs) => {
    if (gs.instructionsBody.exists) {
        gs.instructionsBody.object.remove();
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- add definitions divs
 *********************************************************************/
var addDefinitionDivs = (acc, curr, arrIndex, $, gs) => {
    if (gs.definitionsBody.exists) {
        gs.definitionsBody.object.first().before('<div class="definitions-container"></div>');
        gs.definitionsBody.object.prependTo('.definitions-container');
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- add passage divs
 *********************************************************************/
var addPassageDivs = (acc, curr, arrIndex, $, gs) => {
    if (gs.passageBody.exists) {
        gs.passageBody.object.first().before('<div class="passage-container"></div>');
        gs.passageBody.object.prependTo('.passage-container');
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- fix cheerio
 *********************************************************************/
var fixCheerio = (acc, curr, arrIndex) => {
    var searchAndRemove = ['<html>','</html>','<head>','</head>','<body>','</body>'];
    var regexForTooManyLineBreaks = RegExp(/\n{2,}/g);
    searchAndRemove.forEach( (string) => {
        if (curr.passagetext.includes(string)) {
            curr.passagetext = curr.passagetext.replace(string, '');
        }
    } );
    if (regexForTooManyLineBreaks.test(curr.passagetext)) {
        curr.passagetext = curr.passagetext.replace(regexForTooManyLineBreaks, '');
    }
};

/********************************************************************
 * reducer -- edit passage text (HTML Stuff) -- main
 *********************************************************************/
var editPassageText = function (acc, curr, arrIndex) {
    var $ = cheerio.load(curr.passagetext);
    var gs = findLandmarks(acc, curr, arrIndex, $);
    removeImages (acc, curr, arrIndex, $, gs);
    replaceAudio (acc, curr, arrIndex, $, gs);
    removeInstructions (acc, curr, arrIndex, $, gs);
    addDefinitionDivs (acc, curr, arrIndex, $, gs);
    addPassageDivs (acc, curr, arrIndex, $, gs);
    curr.passagetext = $.html();
    fixCheerio (acc, curr, arrIndex);
    // console.log(`In ${curr.currentfile} on row ${arrIndex+indexOffset} the post edit is\n${curr.passagetext}\n`);
};

/********************************************************************
 * reducer -- Fix Cando
 *********************************************************************/
var fixQuestionCando = (acc, curr, arrIndex) => {
    var lowerFilename = curr.currentfile.toLowerCase();
    var shouldUpdateCando = lowerFilename[3] === 'r' || lowerFilename[3] === 'w';
    var regexForQuestionCando = RegExp(/f\d{1,2}/i);
    // This is verifying that the input is a valid and expected input
    if (curr.questioncando !== undefined && !regexForQuestionCando.test(curr.questioncando) && curr.questioncando !== '') {
        questioncandoLogReport += `${batch}|${curr.currentfile}|${arrIndex+indexOffset}|${curr.questioncando}|NOTE|This value was changed from "${curr.questioncando}" to "".\n`;
        curr.questioncando = '';
    }
    // This is changing the value of the field from a previous value to the new value it needs to be
    if (curr.questioncando !== undefined && shouldUpdateCando && curr.questioncando !== '') {
        if      (curr.questioncando === 'f9') curr.questioncando = 'f10'; // f9 to f10
        else if (curr.questioncando === 'f10') curr.questioncando = 'f11'; // f10 to f11
        else if (curr.questioncando === 'f11') curr.questioncando = 'f9'; // f11 to f9
        else if (curr.questioncando === 'f31') curr.questioncando = 'f30'; // f31 to f30
    }
};


/********************************************************************
 * reducer -- rename keys -- change key machine
 *********************************************************************/

/********************************************************************
 * reducer -- rename keys
 *********************************************************************/
var renameKeys = (acc, curr, arrIndex) => {
    var keysToChange = [
        {
            oldKey: 'passageaudiofilename',
            newKey: 'passageaudiotranscript'
        },
        {
            oldKey: 'questionaudiofilename',
            newKey: 'questionaudiotranscript'
        }
    ];
    var changeKeyMachine = (acc, curr, arrIndex, keys) => {
        if (curr[keys.oldKey] !== undefined) {
            curr[keys.newKey] = curr[keys.oldKey];
            delete curr[keys.oldKey];
        }
    };
    keysToChange.forEach( (keys) => {
        changeKeyMachine(acc, curr, arrIndex, keys);
    });
};

/********************************************************************
 * reducer -- split questionname
 *********************************************************************/
var splitQuestionName = (acc, curr, arrIndex) => {
    if (curr.questionname !== undefined && curr.questionname !== '') {
        var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
        curr.questionname = pqname.replace(/passage\d+/i, '');
        curr.passagename = pqname.replace(/question\d+/i, '');
    }
};

/********************************************************************
 * reducer -- verify passagetexttype
 *********************************************************************/
var verifyPassageTextType = (acc, curr, arrIndex) => {
    if (curr.passagetexttype !== undefined) {
        if (curr.passagetexttype.toLowerCase() !== 'c1' || curr.passagetexttype.toLowerCase() !== 'c2' || curr.passagetexttype.toLowerCase() !== 'c3' || curr.passagetexttype !== '') {
            passagetexttypeLogReport += `${batch}|${curr.currentfile}|${arrIndex + indexOffset}|${curr.passagetexttype}|WARNING|This passagetexttype was set to a non-standard value. It was not changed.\n`;
        }
    }
};

/********************************************************************
 * reducer -- verify questiontype
 *********************************************************************/
var verifyQuestionType = (acc, curr, arrIndex) => {
    if (curr.questiontype !== undefined && curr.questiontype.includes('long ansswer')) {
        curr.questiontype = 'long answer';
    }
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
    return originalFileName.replace(/(\w\w_\w\d_\w\w_\w\d+).*/, '$1_FA18.csv');
};

/********************************************************************
 * main -- foreach -- find and set batch type
 *********************************************************************/
var setBatchType = (file) => {
    var lowerFilename = file.toLowerCase();
    if (lowerFilename[3] === 'r') {
        batch = batchArr[0];
    } else if (lowerFilename[3] === 'l') {
        batch = batchArr[1];
    } else if (lowerFilename[3] === 'w') {
        batch = batchArr[2];
    } else if (lowerFilename[3] === 's') {
        batch = batchArr[3];
    } else {
        console.error(`${file} did not conform to expected file naming standards!`);
    }
};

/********************************************************************
 * main / print report logs -- write file
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = path.join(outputDirectory, outputName);
    fs.writeFile(outputLocation, dataToOutput, function (err) {
        if (err) 
            console.error(err);
        else 
            console.log('Output file to: ' + outputLocation);
    });
};

/********************************************************************
 * main -- print report logs
 *********************************************************************/
var printReportLogs = () => {
    writeFile(od_reports, 'audio-file-Report.csv', audioFilesLogReport); // A record of all
    writeFile(od_reports, 'questioncando-Report.csv', questioncandoLogReport); // A record of all
    writeFile(od_reports, 'passage-text-type-Report.csv', passagetexttypeLogReport); // A record of all
    writeFile(od_reports, 'missing-html-landmarks-Report.csv', missingLandmarksReport); // A record of all
    writeFile(od_reports, 'inferred-html-landmarks-Report.csv', inferredLandmarksReport); // A record of all
    writeFile(od_reports, 'fixme-Report.csv', fixmeReport); // A record of all
    writeFile(od_reports, 'imageTagsReport.csv', imageTagsReport); // A record of all
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
        initAcc: []
    };
    targetFiles.forEach( (file) => {
        csvrOptions.batch = setBatchType(file);
        csvrOptions.currentfile = file;
        var csv = fs.readFileSync(path.join(targetDirectory, file), 'utf8'); // Read-In File
        var csvProcessor = csvr(csv, csvrOptions, reducer);
        var newFileName = setNewFileName(file);
        writeFile(od_noErrors, newFileName, csvProcessor.getFormattedCSV()); // Write the File
    } );
    printReportLogs();
})();
