/********************************************************************
 * Declare Dependancies
 *********************************************************************/
// Core Libraries
const fs = require('fs');
const csvr = require('./main.js');
const cheerio = require('cheerio');
const asynclib = require('async');
// UUID
const uuidv4 = require('uuid/v4'); 
const uuidv5 = require('uuid/v5');
const applicationNS = 'EC_POC';
// Error Document
var errorDocument = 'The Following Errors Occurred While Parsing the EC3 CSVs On ' + Date() + '\n';
var errorHeader = '\nThe Following Files Had One or More Error:\n';
var errorBody = '\n';
// Optional Reports:
var batch = 'Writing'; // set batch here
var audioFilesLogReport = 'batch|filename|row|value|message\n'; // ___Report += `${}|${}|${}|${}|${}\n`
var questioncandoLogReport = 'batch|filename|row|value|message\n';
var passagetexttypeLogReport = 'batch|filename|row|value|message\n';
var temporaryproblemReport = 'batch|filename|row|value|message\n';
// Other Variables
var uniqueString = '<div class="addclosingdiv">heylookherethisisasentancethatwillhopefullyneverappearinanyfilefromheretotherestofforeverinanyec3courseyay</div>';
var uniqueStringForAudioTags = '[[Replace audio file here filename.mp3]]';
// const targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-originals/R/'; // for production
var targetDirectory = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/I_W/'; // for production
var od_noErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-no-errors/W/'; // for production
var od_foundErrors = './csv-tests/ec3/ec3-production/ec3-csvs-outputs/ec3-csvs-found-errors/'; // for production
var indexOffset = 2;
var counter = 0;


/********************************************************************
 * read in a list of files to 
 *********************************************************************/
var getTargetFiles = function (targetDirectory) {
    var filesInDirectory = fs.readdirSync(targetDirectory);
    var desiredFilesOnly = filesInDirectory.reduce(function (acc, curr) {
        if (curr.slice(-4) === '.csv'){
            acc.push(curr);
        }
        return acc;
    }, []);
    console.log(desiredFilesOnly.length);
    return desiredFilesOnly;
};


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
var updateQuestionCanDo = function (acc, curr, arrIndex) {
    if (curr.questioncando !== undefined && !curr.questioncando.toLowerCase().includes('f') && curr.questioncando !== '') {
        // console.log(`In ${acc.options.currentFile} on row ${arrIndex+indexOffset} in questioncando it says: "${curr.questioncando}"`);
        questioncandoLogReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${curr.questioncando}|NOTE: This value was changed from "${curr.questioncando}" to "".\n`;
        curr.questioncando = '';
    }
    // This needs to be separate from the above if statement.
    if (curr.questioncando !== undefined && acc.options.updateCanDoField && curr.questioncando !== '') {
        if (curr.questioncando === 'f9') { // and file is for read or write,
            curr.questioncando = 'f10'; // f9 to f10
        } else if (curr.questioncando === 'f10') {
            curr.questioncando = 'f11'; // f10 to f11
        } else if (curr.questioncando === 'f11') {
            curr.questioncando = 'f9'; // f11 to f9
        } else if (curr.questioncando === 'f31') {
            curr.questioncando = 'f30'; // f31 to f30
        }
        curr.completedStatus.updateCanDo.status = true;
    } else if (curr.questioncando === undefined) {
        curr.completedStatus.updateCanDo.status = false;
        curr.completedStatus.updateCanDo.message = 'WARNING: questioncando field is undefined on this file!';
    } else if (acc.options.updateCanDoField === false) {
        delete curr.completedStatus.updateCanDo;
    }
};

/********************************************************************
 * If the ID field is blank or undefined, generate a unique id to fill
 * the blank field.
 *********************************************************************/
var checkIdField = function (acc, curr, arrIndex) {
    try {
        if (false || curr.id === undefined || curr.id === '' || curr.id === ' ') { // change to true ONLY if you want to change the ID of every item in every csv. Keep on false by default.
            curr.id = uuidv5(applicationNS, uuidv4());
            curr.completedStatus.idFieldFilled.status = false;
            curr.completedStatus.idFieldFilled.message = 'NOTE: The ID needed to be created! This new ID may not match the original batch!';
        } else {
            curr.completedStatus.idFieldFilled.status = true;
            curr.completedStatus.idFieldFilled.message = 'NOTE: The ID already existed!';
        }
        if (curr.id === undefined) {
            curr.completedStatus.idFieldFilled.status = false;
            curr.completedStatus.idFieldFilled.message = 'ERR0R: Unable to define the ID!';
        }
    } catch (e) {
        curr.completedStatus.idFieldFilled.status = false;
        curr.completedStatus.idFieldFilled.message = 'ERR0R: Something happnened when trying to set the ID!\n' + e;
    }
};

/********************************************************************
 *  splitQuestionName into questionname and passagename
 *********************************************************************/
var splitQuestionName = function (acc, curr, arrIndex) {
    if (curr.questionname !== undefined && curr.questionname !== ''){
        var pqname = curr.questionname.replace(/\s/g, ''); //remove all spaces
        curr.questionname = pqname.replace(/passage\d+/i, '');
        curr.passagename = pqname.replace(/question\d+/i, '');
        curr.completedStatus.splitField.status = true;
    } else {
        curr.completedStatus.splitField.status = false;
        curr.completedStatus.splitField.message = 'WARNING: questionname field does not exist on this file!';
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${curr.questionname}|WARNING: The 'questionname' field appears to be blank\n`;
    }
};

/********************************************************************
 * 
 *********************************************************************/
var verifyQuestionTypeField = function (acc, curr, arrIndex) {
    if (curr.questiontype !== undefined && curr.questiontype.includes('long ansswer')) {
        // console.log(`In file ${acc.options.currentFile} on row ${arrIndex+indexOffset} it says ${curr.questiontype}`);
        curr.questiontype = 'long answer';
        curr.completedStatus.questionTypeVerified.status = true;
        curr.completedStatus.questionTypeVerified.message = 'NOTE: This file needed input fixed from "long ansswer" to "long answer"';
    } else {
        curr.completedStatus.questionTypeVerified.status = true;
        curr.completedStatus.questionTypeVerified.message = 'NOTE: This file didn\'t need any fixing.';
    }
};

/********************************************************************
 * 
 *********************************************************************/
var verifyPassageTextType = function (acc, curr, arrIndex) {
    if (curr.passagetexttype !== undefined && (curr.passagetexttype.toLowerCase().includes('c1') || curr.passagetexttype.toLowerCase().includes('c2') || curr.passagetexttype.toLowerCase().includes('c3') || curr.passagetexttype === '')) {
        curr.completedStatus.passageTextTypeVerified.status = true;
        curr.completedStatus.passageTextTypeVerified.message = 'NOTE: This file is fine.';
    } else if (curr.passagetexttype === undefined) {
        curr.completedStatus.passageTextTypeVerified.status = true;
        curr.completedStatus.passageTextTypeVerified.message = 'NOTE: This field is undefined.';
    } else {
        passagetexttypeLogReport += `${batch}|${acc.options.currentFile}|${arrIndex + indexOffset}|${curr.passagetexttype}|NOTE: This passagetexttype was set to a non-standard value. It was not changed.\n`;
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex + indexOffset}|${curr.passagetexttype}|NOTE: This passagetexttype was set to a non-standard value. It was not changed.\n`;
        
        // curr.passagetexttype = ''; // Ted Said don't edit this field, just log it. Don't include undefined or blank values in the report.
        curr.completedStatus.passageTextTypeVerified.status = false;
        curr.completedStatus.passageTextTypeVerified.message = `WARNING: passagetexttype was set to a non-standard value. passagetexttype = ${curr.passagetexttype}`;
    }
};

/********************************************************************
 * Renames then deletes some keys on the json.
 *********************************************************************/
var deleteKeys = function (acc, curr) {
    if (curr.passageaudiofilename !== undefined && curr.questionaudiofilename !== undefined && curr.passageaudiofilename !== '' && curr.questionaudiofilename !== '') {
        curr.passageaudiotranscript = curr.passageaudiofilename;
        curr.questionaudiotranscript = curr.questionaudiofilename;
        delete curr.passageaudiofilename;
        delete curr.questionaudiofilename;
        curr.completedStatus.keyRename.status = true;
    } else {
        curr.passageaudiotranscript = curr.passageaudiofilename;
        curr.questionaudiotranscript = curr.questionaudiofilename;
        curr.completedStatus.keyRename.status = false;
        let errorMessage = '';
        if (curr.passageaudiofilename === undefined && curr.questionaudiofilename !== undefined) {
            errorMessage = 'WARNING: passageaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename !== undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'WARNING: questionaudiofilename field is undefined on this file!...Adding blank definition...';
        } else if (curr.passageaudiofilename === undefined && curr.questionaudiofilename === undefined) {
            errorMessage = 'WARNING: Both passageaudiofilename and questionaudiofilename field are undefined on this file!...Attempting to copy keys anyway...';
        }
        curr.completedStatus.keyRename.message = errorMessage;
    }
};

/********************************************************************
 * Edit passagetext: setGlobalSelectors
 * 
 * NOTE:    
 * USE:     
 * RETURNS: 
 *********************************************************************/
var setGlobalSelectors = function (acc, curr, arrIndex, $) {
    var gs = {
        instructions: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        warmup: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        passage: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        definitions: {
            exists: false,
            object: new Object(),
            set: () => {}
        },
        passageReplacement: {
            exists: false,
            object: new Object(),
            set: () => {}
        }
    };

    // Finding <h1>Instructions</h1> and exceptions
    gs.instructions.set = () => {
        gs.instructions.exists = false;
        var findInstructions = new Object();
        findInstructions = $('h1').add('h2').add('h3').filter((index, ele) => {
            if ($(ele).text().toLowerCase().includes('instruction')) {
                gs.instructions.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('in') && ele.name === 'h1') {
                // console.log($(ele).html()); // uncomment if you want to see the non-strict captures.
                gs.instructions.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h1') {
                // console.log(`${acc.options.currentFile} - row ${arrIndex+indexOffset} - Has an ${ele.name} ${$(ele).text()} tag`);
            }
        }).first();
        gs.instructions.object = findInstructions;
        return findInstructions;
    };
    gs.instructions.set();
    // if (!gs.instructions.exists) {console.log(`${gs.instructions.exists} + ${counter++} + ${acc.options.currentFile} + row ${arrIndex+indexOffset}`);}
    
    // Finding <h2>Warm-up</h2> and exceptions
    gs.warmup.set = () => {
        gs.warmup.exists = false;
        var findWarmup = $('h2').filter((index, ele) => {
            if (($(ele).text().toLowerCase().includes('warm') || $(ele).text().toLowerCase().includes('wam')) && $(ele).text().toLowerCase().includes('up')) {
                gs.warmup.exists = true;
                return $(ele);
            }
        }).first();
        if (gs.warmup.exists) {
            gs.warmup.object = findWarmup;
            return findWarmup; 
        }
    };
    gs.warmup.set();
    
    // Finding <h2>Passage</h2> and exceptions
    gs.passage.set = () => {
        gs.passage.exists = false;
        var findPassage = $('h2').add('h3').filter((index, ele) => {
            if ($(ele).text() === 'Passage' && ele.name === 'h2') {
                gs.passage.exists = true;
                return $(ele);
            } else if ( ($(ele).text().toLowerCase().includes('passage') || $(ele).text().toLowerCase().includes('pasage')) && ele.name === 'h2' ) {
                $(ele).html('Passage'); // fix misspelling
                gs.passage.exists = true;
                return $(ele);
            } else if ($(ele).text().toLowerCase().includes('passage') && ele.name === 'h3') {
                // console.log(`${acc.options.currentFile} has ${ele.name} tags in one of its passage tags on row ${arrIndex+indexOffset}.`);
                $(ele).replaceWith('<h2>Passage</h2>');
                gs.passage.exists = true;
                return $(ele);
            }
        }).first();
        if (gs.passage.exists === false) {
            if (gs.instructions.object.nextAll().filter('p').last().text().toLowerCase().includes('write a response to each of the prompts below')) {
                // console.log(gs.instructions.object.nextAll().filter('p').last().text());
                findPassage = gs.instructions.object.nextAll().filter('p').last();
                gs.passage.exists = true;
            }
        }
        gs.passage.object = findPassage;
        return findPassage;  
    };
    gs.passage.set();
    

    // Finding <h2>Definitions</h2>
    gs.definitions.set = () => {
        gs.definitions.exists = false;
        var findDefinitions = $('h2').filter((index, ele) => {
            if ($(ele).text().toLowerCase().includes('definition')) {
                gs.definitions.exists = true;
                return $(ele);
            }
        }).first();
        gs.definitions.object = findDefinitions;
        return findDefinitions;
    };
    gs.definitions.set();

    return gs;
};

/********************************************************************
 * Edit passagetext: replaceAudioTag
 *********************************************************************/
var replaceAudioTag = function (acc, curr, arrIndex, $, gs) {
    var audioTags = $('audio');
    if (audioTags.length > 1) {
        // console.log(audioTags.length);
        curr.completedStatus.audioFileEditComplete.status = false;
        curr.completedStatus.audioFileEditComplete.message = 'ERR0R: This row had more than one audio file!';
        if (audioTags.length === 2) {
            curr.audiofilelink1 = audioTags.first().attr('src');
            curr.audiofilelink2 = audioTags.last().attr('src');
            audioFilesLogReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${curr.audiofilelink1}|IMPORTANT NOTE: This file has more than one audio tag!\n`;
            audioFilesLogReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${curr.audiofilelink2}|IMPORTANT NOTE: This file has more than one audio tag!\n`;
            audioTags.first().replaceWith(uniqueStringForAudioTags);
            audioTags.last().replaceWith(uniqueStringForAudioTags);
            curr.completedStatus.audioFileEditComplete.status = true;
            curr.completedStatus.audioFileEditComplete.message = 'NOTE: There were two audio files in this row. Handling both.';
        }
    } else if (audioTags.length === 1) {
        var audioSrc = audioTags.attr('src');
        audioFilesLogReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}|${audioSrc}|NOTE: Success!\n`;
        audioTags.replaceWith(uniqueStringForAudioTags);
        curr.completedStatus.audioFileEditComplete.status = true;
        curr.completedStatus.audioFileEditComplete.message = `NOTE: This row's audio source is: ${audioSrc}`;
    } else if (audioTags.length < 1) {
        curr.completedStatus.audioFileEditComplete.status = true;
        curr.completedStatus.audioFileEditComplete.message = 'NOTE: This row had no audio files.';
    }
    // console.log(`${acc.options.currentFile} on row ${arrIndex+indexOffset} src is: ${audioTags.length/*.attr('src')*/}`);
};

/********************************************************************
 * Edit passagetext: removeText
 * 
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var replaceText = function (acc, curr, arrIndex, $, gs) {
    var instructions = gs.instructions.set();
    var iExists = gs.instructions.exists;
    var warmup = gs.warmup.set();
    var wExists = gs.warmup.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    if (!iExists && wExists && pExists) {
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}||ERR0R: This HTML is missing its <h1>Instructions</h1>.\n`;
    } else if (iExists && wExists && !pExists) {
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}||ERR0R: Could not find <h2>Passage</h2>.\n`;
    } else if (iExists && !wExists&& !pExists) {
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}||ERR0R: Could not find a <h2>Warm-up</h2> or an <h2>Passage</h2>.\n`;
    } else if (!iExists && !wExists && !pExists) {
        temporaryproblemReport += `${batch}|${acc.options.currentFile}|${arrIndex+indexOffset}||ERR0R: This HTML is missing all vital landmarks and could not be edited.\n`;
    }

    $('img').remove(); // They want all images removed. Any they want added in will be done in post-processing.

    if (iExists && wExists) {
        instructions.nextUntil(warmup).add(instructions).add(warmup.nextUntil(passage).not($('p').has('strong'))).remove('*');
        warmup.before('<h2>Definitions</h2>');
        warmup.remove();
        curr.completedStatus.passageDelete.status = true;
    } else if (iExists && pExists) {
        instructions.nextUntil(passage).add(instructions).not($('p').has('strong')).remove('*');
        $('p').has('strong').first().before('<h2>Definitions</h2>');
        curr.completedStatus.passageDelete.status = true;
        curr.completedStatus.passageDelete.message = 'NOTE: first h2 tag is <h2>Passage</h2>';
    } else if (iExists & !wExists && !pExists) {
        curr.completedStatus.passageDelete.status = false;
        curr.completedStatus.passageDelete.message = 'NOTE: Instructions exist, but Warm-up and Passage do not. Ask Ted what to do.';
    } else {
        curr.completedStatus.passageDelete.status = true;
        if (!iExists && wExists) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h1>Instructions</h1>!" (replaceText Function)';
        } else if (iExists && !wExists) {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find "<h2>Warm-up</h2>!" (replaceText Function)';
        } else {
            curr.completedStatus.passageDelete.message = 'ERR0R: Couldn\'t find both "<h1>Instructions</h1>" and "<h2>Warm-up</h2>!" (replaceText Function)';
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
var addClassDefinitions = function (acc, curr, arrIndex, $, gs) {
    // Gets all the <p><strong> combinations between the first h2 tag and the next one.
    var definitions = gs.definitions.set();
    var dExists = gs.definitions.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    if (!dExists) {
        // console.log($('h2').first().text());
    }
    
    if (dExists && pExists) {
        var pstrong = definitions.nextUntil(passage).filter('p').has('strong');
        var pem = definitions.nextUntil(passage).filter('p').has('em');
        pstrong.addClass('vocab-definition');
        pem.removeClass('vocab-definition');
        pem.addClass('vocab-example');
        curr.completedStatus.passageClass.status = true;
    } else {
        curr.completedStatus.passageClass.status = false;
        if (!dExists && pExists) {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addClassDefinitions Function)';
        } else if (dExists && !pExists) {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find "<h2>Passage</h2>" (addClassDefinitions Function)';
        } else {
            curr.completedStatus.passageClass.message = 'ERR0R: Couldn\'t find both "<h2>Definitions</h2>" and "<h2>Passage</h2>" (addClassDefinitions Function)';
        }
    }
};

/********************************************************************
 * Edit passagetext: addDivsAround
 *
 * USE:     in reduce function. Needs accumulator, current item, and
 *          cheerio object
 * RETURNS: void
 *********************************************************************/
var addDivsAround = function (acc, curr, arrIndex, $, gs) {
    var definitions = gs.definitions.set();
    var dExists = gs.definitions.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    if (dExists) {
        definitions.before($('<div class="definitions-container">'));
        definitions.nextUntil(passage).last().after($(uniqueString));
        curr.completedStatus.passageDivDefinition.status = true;
    } else {
        curr.completedStatus.passageDivDefinition.status = false;
        curr.completedStatus.passageDivDefinition.message = 'ERR0R: Couldn\'t find "<h2>Definitions</h2>" (addDivsAround Function)';
    }
    if (pExists){
        passage.before($('<div class="passage-container">'));
        passage.nextAll().last().after($(uniqueString));
        curr.completedStatus.passageDivPassage.status = true;
    } else {
        curr.completedStatus.passageDivPassage.status = false;
        curr.completedStatus.passageDivPassage.message = 'ERR0R: Couldn\'t find "<h2>Passage</h2>" (addDivsAround Function)';
    }
};

/********************************************************************
 * 
 *********************************************************************/
var htmlPostProcessing = function (acc, curr, arrIndex, $, gs) {
    var instructions = gs.instructions.set();
    var iExists = gs.instructions.exists;
    var warmup = gs.warmup.set();
    var wExists = gs.warmup.exists;
    var definitions = gs.definitions.set();
    var dExists = gs.definitions.exists;
    var passage = gs.passage.set();
    var pExists = gs.passage.exists;

    var passageReplacement;
    var prExists = false;

    var failed = {
        deletes: !curr.completedStatus.passageDelete.status, // sets to true if the process failed
        classes: !curr.completedStatus.passageClass.status, 
        dDivs: !curr.completedStatus.passageDivDefinition.status,
        pDivs: !curr.completedStatus.passageDivPassage.status
    };

    if (failed.deletes) {
        if (iExists && !wExists && !pExists) {
            console.log(`${`in ${acc.options.currentFile} on row ${arrIndex+indexOffset}`.padEnd(50,'.')} Exists: Instructions | Doesn't: Warm-up, Passage`);
            if (false) {
                null;
            }
            if ( instructions.nextAll().filter('p').last().text().toLowerCase().includes('write a response to each of the prompts below') ) {
                console.log(instructions.nextAll().filter('p').last().text());
                passageReplacement = instructions.nextAll().filter('p').last();
                prExists = true;
                null;
            }
        } else if (iExists && wExists && !pExists) {
            console.log(`${`in ${acc.options.currentFile} on row ${arrIndex+indexOffset}`.padEnd(50,'.')} Exists: Instructions, Warm-up | Doesn't: Passage`);
            null;
        } else if (iExists && !wExists && pExists) {
            console.log(`${`in ${acc.options.currentFile} on row ${arrIndex+indexOffset}`.padEnd(50,'.')} Exists: Instructions, Passage | Doesn't: Warm-up`);
            null;
        } else {
            console.log(`${`in ${acc.options.currentFile} on row ${arrIndex+indexOffset}`.padEnd(50, '.')} deletes failed and there were uncaught exceptions.`);
        }
        if (prExists) {

        }
    }
    // if (failed.classes) {
    //     null;
    // }
    // if (failed.dDivs) {
    //     null;
    // }
    // if (failed.pDivs) {
    //     null;
    // }
};

/********************************************************************
 * Edit passagetext: Fix Cheerio
 * DESCRIPTION: Cheerio thinks its so smart and needs to add stuff we
 *              don't want in both html and xml mode. This function
 *              fixes those problems by editing the string directly
 *              and putting stuff where it belongs.
 * USE: in reduce function.Needs accumulator, and current item
 * RETURNS: void
 *********************************************************************/
var fixCheerio = function (acc, curr) {
    var regexForUniqueString = new RegExp(uniqueString, 'g');
    if (curr.passagetext.includes(uniqueString)) {
        curr.passagetext = curr.passagetext.replace(regexForUniqueString, '</div>');
        curr.completedStatus.fixCheerioAddCloseDiv.status = true;
    } else {
        curr.completedStatus.fixCheerioAddCloseDiv.status = false;
        curr.completedStatus.fixCheerioAddCloseDiv.message = 'ERR0R: "<div class="definitions-container">" AND "<div class="passage-container">" HAVE NO "</div>" !!!';
    }
    if (curr.passagetext.includes('</link>')){
        curr.passagetext = curr.passagetext.replace(/<\/link>/g, '');
        curr.completedStatus.fixCheerioRemoveCloseLink.status = true;
    } else {
        curr.completedStatus.fixCheerioRemoveCloseLink.status = false;
        curr.completedStatus.fixCheerioRemoveCloseLink.message = 'WARNING: Couldn\'t find any </link> to remove!';
    }
};

/********************************************************************
 * Edit passagetext
 *********************************************************************/
var editPassageText = function (acc, curr, arrIndex) {
    try {
        var $ = cheerio.load(curr.passagetext, {xmlMode: true}); // Declare Cheerio Object
        var gs = setGlobalSelectors(acc, curr, arrIndex, $);
        replaceAudioTag(acc, curr, arrIndex, $, gs);
        replaceText(acc, curr, arrIndex, $, gs); // "Passage Content to Delete" Section
        addClassDefinitions(acc, curr, arrIndex, $, gs); // "Adding Class Definitions"
        addDivsAround(acc, curr, arrIndex, $, gs); // "Add Divs" Section
        // TODO post-process html to catch anything that fits certain parameters
        htmlPostProcessing(acc, curr, arrIndex, $, gs);
        curr.passagetext = $.html();
        fixCheerio(acc, curr);
        curr.completedStatus.cheerioCanReadPassage.status = true;
    } catch (err) {
        errorBody += `${acc.options.currentFile} ${arrIndex+indexOffset} '\n'${err}\n`;
        curr.completedStatus.cheerioCanReadPassage.status = false;
        curr.completedStatus.cheerioCanReadPassage.message = 'FATAL ERR0R: Cheerio was unable to edit the passagetext\'s HTML (Did it have any?)!';
        delete curr.completedStatus.passageDelete;
        delete curr.completedStatus.passageClass;
        delete curr.completedStatus.passageDivDefinition;
        delete curr.completedStatus.passageDivPassage;
        delete curr.completedStatus.fixCheerioAddCloseDiv;
        delete curr.completedStatus.fixCheerioRemoveCloseLink;
    }
};

/********************************************************************
 * Main Reducer Function
 *********************************************************************/
var reducer = function (acc, curr, i) {
    curr.completedStatus = {
        updateCanDo: {
            status: false,
            message: 'Default Message'
        },
        idFieldFilled: {
            status: false,
            message: 'Default Message'
        },
        splitField: {
            status: false,
            message: 'Default Message'
        },
        keyRename: {
            status: false,
            message: 'Default Message'
        },
        questionTypeVerified: {
            status: false,
            message: 'Default Message'
        },
        passageTextTypeVerified: {
            status: false,
            message: 'Default Message'
        },
        cheerioCanReadPassage: {
            status: false,
            message: 'Default Message'
        },
        audioFileEditComplete: {
            status: false,
            message: 'Default Message'
        },
        passageDelete: {
            status: false,
            message: 'Default Message'
        },
        passageClass: {
            status: false,
            message: 'Default Message'
        },
        passageDivDefinition: {
            status: false,
            message: 'Default Message'
        },
        passageDivPassage: {
            status: false,
            message: 'Default Message'
        },
        fixCheerioAddCloseDiv: {
            status: false,
            message: 'Default Message'
        },
        fixCheerioRemoveCloseLink: {
            status: false,
            message: 'Default Message'
        },
        changeDifficulty: {
            status: false,
            message: 'Default Message'
        }
    };
    curr.thisFileNameIs = acc.options.currentFile;
    checkIdField(acc, curr, i);
    updateQuestionCanDo(acc, curr, i);
    deleteKeys(acc, curr);
    splitQuestionName(acc, curr, i);
    verifyPassageTextType(acc, curr, i);
    verifyQuestionTypeField(acc, curr, i);
    editPassageText(acc, curr, i);
    everyTaskSuccessful(acc, curr);
    acc.push(curr);
    acc.options.counter++;
    return acc;
};

/********************************************************************
 * Checks to see if on the current row, every task was successful.
 *********************************************************************/
var everyTaskSuccessful = function (acc, curr) {
    curr.everyTaskSuccessful = Object.keys(curr.completedStatus).every(function (task) {
        return curr.completedStatus[task].status;
    });
};

/********************************************************************
 * used as a determinator for which directory the output files should
 * go into.
 *********************************************************************/
var everyRowPassed = function (reducedCSV) {
    return reducedCSV.every(function (row) {
        if (row.everyTaskSuccessful) {
            return true;
        } else {
            return false;
        }
    });
};

/********************************************************************
 * Changes Difficulty Level to either 0 or 1
 *********************************************************************/
var changeDifficultyLevel = function (reducedCSV) {
    var lowestDifficultyLevel = 1000;
    if (reducedCSV[0].difficultylevel !== undefined) {
        reducedCSV.forEach((row) => {
            if (row.difficultylevel < lowestDifficultyLevel && !isNaN(parseInt(row.difficultylevel, 10))) {
                lowestDifficultyLevel = row.difficultylevel;
            } else if (isNaN(parseInt(row.difficultylevel, 10))) {
                row.difficultylevel = 0;
                row.completedStatus.changeDifficulty.status = true;
                row.completedStatus.changeDifficulty.message = `ERR0R: difficultylevel input is not a number! NaN Error. It says: "${row.difficultylevel}"`;
            }
        });
        reducedCSV.forEach((row) => {
            if (row.difficultylevel > lowestDifficultyLevel && !isNaN(parseInt(row.difficultylevel, 10))) {
                row.completedStatus.changeDifficulty.status = true;
                row.difficultylevel = 1;
            } else if (!isNaN(parseInt(row.difficultylevel, 10))) {
                row.completedStatus.changeDifficulty.status = true;
                row.difficultylevel = 0;
            }
        });
    } else {
        reducedCSV.forEach((row) => {
            row.completedStatus.changeDifficulty.status = false;
            row.completedStatus.changeDifficulty.message = 'WARNING: difficultylevel field is undefined on this file!';
        });
    }
};

/********************************************************************
 * appendErrorLog
 *********************************************************************/
var appendErrorLog = function (reducedCSV, allPassed) {
    // Override completedStatus of reducedCSV to filter which items make it onto the error log. (Any Non-Commented Lines Will effect every row on every file).
    reducedCSV.forEach(function (row) {
        try{row.completedStatus.idFieldFilled.status = true;}catch(e){}             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.updateCanDo.status = true;}catch(e){}               // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.splitField.status = true;}catch(e){}                // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        try{row.completedStatus.keyRename.status = true;}catch(e){}                 // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.questionTypeVerified.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.cheerioCanReadPassage.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.audioFileEditComplete.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDelete.status = true;}catch(e){}             // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageClass.status = true;}catch(e){}              // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDivDefinition.status = true;}catch(e){}      // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.passageDivPassage.status = true;}catch(e){}         // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.fixCheerioAddCloseDiv.status = true;}catch(e){}     // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.fixCheerioRemoveCloseLink.status = true;}catch(e){} // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        // try{row.completedStatus.changeDifficulty.status = true;}catch(e){}          // Set Any Field to True to Ignore it in the Error Log, and vice versa.
        row.everyTaskSuccessful = Object.keys(row.completedStatus).every(function (task) {return row.completedStatus[task].status;});
        // row.everyTaskSuccessful = true; 
    });
    allPassed = everyRowPassed(reducedCSV);
    // allPassed = true; // Setting this to true will effectively ignore adding anything FOR ALL FILES to the error log.
    if (!allPassed) {
        errorHeader += reducedCSV.options.currentFile + '\n';
        errorBody += '\n' + reducedCSV.options.currentFile + ':\n\t';
        reducedCSV.forEach((row, rowIndex) => {
            if (!row.everyTaskSuccessful) {
                Object.keys(row.completedStatus).forEach(function (task) {
                    if (row.completedStatus[task].status === false) {
                        errorBody += ('At Row ' + (rowIndex+indexOffset).toString().padStart(2, '0') + ', task: "' + task).padEnd(45, ' ') + '": ' + row.completedStatus[task].message +/*  '\n' + row.passagetext + */ '\n\t';
                    }
                });
            }
        });
    }
};

/********************************************************************
 * setNewFileName()
 *********************************************************************/
var setNewFileName = function (originalFileName) {
    var newFileName = originalFileName.replace(/(\w\w_\w\d_\w\w_\w\d+).*/, `${/$1/}_FA18.csv` );
    newFileName = newFileName.replace(/\//g, '');
    return newFileName;
};

/********************************************************************
 * async outputfile
 *********************************************************************/
var writeFile = function (outputDirectory, outputName, dataToOutput) {
    var outputLocation = outputDirectory + outputName;
    fs.writeFile(outputLocation, dataToOutput, function (err) {
        if (err) {
            console.error(err);
        } else {
            // console.log('Output file to: ' + outputLocation);
        }
    });
};

/********************************************************************
 * main
 *********************************************************************/
function main() {
    var outputDirectory = od_noErrors;
    const targetFiles = getTargetFiles(targetDirectory); // Get Array of Files to Cycle Through
    // const targetFiles = ['FP_L1_DE_T10_POC4_V1_CSS.csv', 'FP_R1_DE_T8_POC4_V1_CSS.csv', 'FP_S1_AS_T11_POC4_V1_CSS.csv', 'FP_W1_AS_T10_POC4_V1_CSS.csv']; 
    // const targetFiles = ['FP_L1_DE_T11_POC4_V1_CSS.csv','FP_R1_NA_T8_POC4_V1_CSS.csv','FP_S1_NA_T9_POC4_V1_CSS.csv','FP_W1_NE_T5_POC4_V1_CSS.csv']; // for testing
    var csvrOptions = { // Set Options:
        headersOut: [
            'id', 'skill', 'level', 'difficultylevel', 'function', 'passagetext',
            'passagetexttype', 'passagetype', 'passageaudiotranscript', 'passagename',
            'questionname', 'questioncando', 'questiontext', 'questionlevelfeedback',
            'questiontype', 'questionaudiotranscript', 'answertext1', 'answertext2',
            'answertext3', 'answertext4', 'answertext5', 'answertext6', 'audiofilelink1', 
            'audiofilelink2'
        ],
        initAcc: [],
        updateCanDoField: false,
    };
    // cycle through each file
    var readEditWrite = function (file, callback) {
        csvrOptions.currentFile = file;
        csvrOptions.updateCanDoField = shouldUpdateCando(file); // update option's updateCanDoField variable
        var csv = fs.readFileSync(targetDirectory + file, 'utf8'); // Read-In File
        var outputtedCSV = csvr(csv, csvrOptions, reducer); // Send it through reducer
        var reducedCSV = outputtedCSV.getReducedCSV(); // get reduced, unformatted csv
        // var csvOutput = outputtedCSV.getFormattedCSV(); // get reduced, formatted csv // DONT NEED THIS
        changeDifficultyLevel(reducedCSV); // Edit CSV's Difficulty Level
        var csvOutput = outputtedCSV.formatCSV(reducedCSV, csvrOptions); 
        var allPassed = everyRowPassed(reducedCSV); // Find out if a file passed every test
        var newFileName = setNewFileName(file); // renames files to new format
        // newFileName = file; // Uncomment if you want ot keep the original filename
        appendErrorLog(reducedCSV, allPassed); // Write Errors from each row to error log
        // writeFile(outputDirectory, newFileName, csvOutput); // Write the File
        callback(null);
    };
    // This is where the cycling really happens:
    asynclib.each(targetFiles, readEditWrite, function (err) {
        if (err) console.error(err);
        else {
            errorDocument += errorHeader + errorBody;
            writeFile(od_foundErrors, '__errorLog.txt', errorDocument); // Write Error-Log Document
            writeFile(od_foundErrors, 'audioFileReport.csv', audioFilesLogReport); // A record of all
            writeFile(od_foundErrors, 'questioncandoReport.csv', questioncandoLogReport); // A record of all
            writeFile(od_foundErrors, 'passagetexttypeReport.csv', passagetexttypeLogReport); // A record of all
            writeFile(od_foundErrors, 'temporaryproblemReport.csv', temporaryproblemReport); // A record of all
        }
    });
    // DONE
}

main();