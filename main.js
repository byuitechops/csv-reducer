/********************************************************************
 * Require Dependancies Here
*********************************************************************/
const dsv = require('d3-dsv');
// these two variables can be removed later
const fs =  require('fs');
const target = './csv-tests/countriesDummyData.csv';

/********************************************************************
 * This will check for and remove the Byte-Order-Mark if it exists
 * in the given CSV document Note: BOM can be referenced by:
 * '\ufeff' in utf8, and shows up as 'ef bb bf' in buffer form
*********************************************************************/
const removeBOM = function(stringWithBOM){
    // Insert Code to remove BOM
    console.log('Here is the removeBOM Function');
    return 'csv without bom';
}

/********************************************************************
 * This will use d3-dsv to turn the csv into a json object.
*********************************************************************/
const parseCSV = function(csvToParse){
    //Parse csv into json for further use
    console.log('Here is the parseCSV Function');
    return ['parsed csv'];
}

/********************************************************************
 * csvReducer takes the parsed csv and edits it based on the given
 * function and the options specified
*********************************************************************/
const csvReducer = function(csvToReduce, options, reducerFunction){
    // Choose what to do here based on options
    console.log('Here is the csvReducer Function');
    csvToReduce.reduce(reducerFunction, options.initAcc);
    return ['reduced csv'];
}

/********************************************************************
 * editCSV 
*********************************************************************/
const editCSV = function(reducedValue, initialCSV, options, reducerFunction){
    // Choose what to do here based on options
    console.log('Here is the editCSV Function');
    return '\'Editted CSV Here\'';
}

/********************************************************************
 * 
*********************************************************************/
// ***By adding another signature, we could give the user the option to 
// access to the methods without auto-getnerating the usual end-result
class ModifiedCSV {
    constructor(initialCSV, options, reducerFunction){
        this.newCSV = this.removeBOM(initialCSV);
        this.parsedCSV = this.parseCSV(this.newCSV);
        this.reducedValue = this.csvReducer(this.parsedCSV, options, reducerFunction);
        this.newCSV = this.editCSV(this.reducedValue, this.newCSV, options, reducerFunction);
    }
    // below are data modifying methods, these might be able to be removed from the class 
    // unless we want to let the user access them even after they've been 
    // used the first time in the constructor.
    removeBOM(stringWithBOM){return removeBOM(stringWithBOM);}
    parseCSV(csvToParse){return parseCSV(csvToParse);}
    csvReducer(csvToReduce, options, reducerFunction){return csvReducer(csvToReduce, options, reducerFunction);}
    // It will take a strategic approach to make sure a csv output reflects the reduced value
    editCSV(reducedValue, initialCSV, options, reducerFunction){return editCSV(reducedValue, initialCSV, options, reducerFunction);} 
    // getters
    getObject(){return this.reducedValue;}
    getCSV(){return this.newCSV;}
}

/********************************************************************
 * Here is a quick on-page test of how the class would work:
*********************************************************************/
var tester = new ModifiedCSV(target, {initAcc:[]}, function(acc, curr){acc.push(curr); return acc;});
console.log(tester.getCSV());
console.log(tester.getObject());
// This is interesting because you will still get your file with no BOM at the beginning returned,
// but it can be any document you want, unrelated to the .getObject and .getCSV values.
tester.removeBOM(target); 

/********************************************************************
 * a new class (or object) created based on the given parameters would be the export
*********************************************************************/
module.export= (initialCSV, options, reducerFunction) => {
    // the whole class could be returned, which would include its methods
    // but otherwise just its ModifiedCSV.getObject and ModifiedCSV.getCSV values
    // could be returned as an object.
    return new ModifiedCSV(initialCSV, options, reducerFunction);
}