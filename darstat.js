#!/usr/bin/env node

var program = require('commander')
//	,rp = require('request-promise')
	,moment = require('moment')
	,util = require('util')
  , JSONStream = require('JSONStream') 
	, request= require('request');

function range(val) {
  return val.split('..').map(Number);
} 

program
  .version('0.0.1')
  .usage('[options]')
  .option('-d, --døgn [antal]', 'seneste døgn (default: 1)')
  .option('-å, --år [årstal]', 'ønskede år')
  .option('-p, --periode <fra>..<til>', 'datoperiode (Eksempel: 20150101..20150115)',range)
  .option('-m, --miljø [miljø]', 'DAWA miljø. Feks. dawa-p2')  
  .parse(process.argv);

moment.locale('da');

var host= "http://dawa.aws.dk";
let miljø= program.miljø;
if (miljø) {
	host= host.replace('dawa',miljø); 
} 

var antaldøgn= 1;
var fra= moment(new Date()).subtract({days: antaldøgn});
var til= moment(new Date()); 
if (program.døgn) {
	antaldøgn= parseInt(program.døgn);
	if (isNaN(antaldøgn) || antaldøgn < 1) {
		program.outputHelp();
		process.exit(1);
	}
	fra= moment(new Date()).subtract({days: antaldøgn});
	til= moment(new Date()); 
} else if (program.år) {
	console.log('år: %s', program.år);
	år= parseInt(program.år);
	if (isNaN(år) || år < 2014) {
		program.outputHelp();		
		process.exit(1);
	}
	fra= moment({year: år, month: 0, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0});;
	til= moment({year: år+1, month: 0, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0});; 
} else if (program.periode) {
	
	fra= moment(program.periode[0],'YYYYMMDD');
	if (!fra.isValid()) {
		console.log('%s er ikke en gyldig dato',program.periode[0]);
		program.outputHelp();		
		process.exit(1);
	}

	til= moment(program.periode[1],'YYYYMMDD');
	if (!til.isValid()) {
		console.log('%s er ikke en gyldig dato',program.periode[1]);
		program.outputHelp();		
		process.exit(1);
	}
	til= til.add({days: 1});

	if (!fra.isBefore(til)) {
		program.outputHelp();		
		process.exit(1);
	}
}

//console.log('antal døgn: %d', antaldøgn);
//console.log('%s - %s', fra.utc().toISOString(), til.utc().toISOString());

console.log('Periode: %s - %s',fra.utc().toISOString(), til.utc().toISOString());

var navngivenvejoption= {};
    navngivenvejoption.baseUrl= host;
    navngivenvejoption.url='replikering/haendelser';
    navngivenvejoption.qs= {entitet: 'dar_navngivenvej_aktuel', tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var navngivenvejrequest= request(navngivenvejoption);
//console.log('uri: ' + vejrequest.uri.href);

var vejoption= {};
    vejoption.baseUrl= host;
    vejoption.url='/replikering/vejstykker/haendelser';
    vejoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var vejrequest= request(vejoption);
//console.log('uri: ' + vejrequest.uri.href);

var adresseoption= {};
    adresseoption.baseUrl= host;
    adresseoption.url='/replikering/adresser/haendelser';
    adresseoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var adresserequest= request(adresseoption);
//console.log('uri: ' + adresserequest.uri.href);

var adgangsadresseoption= {};
    adgangsadresseoption.baseUrl= host;
    adgangsadresseoption.url='/replikering/adgangsadresser/haendelser';
    adgangsadresseoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var adgangsadresserequest= request(adgangsadresseoption);
//console.log('uri: ' + adgangsadresserequest.uri.href);

//---------------------------------------------------------------------------------------------------------------
// jsonparser
//
function jsonparser(navn) {
	var parser= JSONStream.parse('*');

	parser.on('error', function (obj) {
  	console.log('%s - JSONparser error: %s', navn, obj);
	});

	return parser;
}

//-----------------------------------------------------------------------------------------------------------------
// Analyse
//
var start= Date.now();


const { Transform } = require('stream');

class StatTransform extends Transform {
  constructor(options) {
    super(options);
    this.stat= new Map();
    this.statname= options.statname;
    this.antal= 0;
  }
  _transform(chunk, encoding, callback) {
  	const count = this.stat.get(chunk.operation) || 0;
   	this.stat.set(chunk.operation, count + 1);
  	this.antal++;
		//this.push(util.format("%s - %d: %s\n\r",this.statname, this.antal, chunk.operation));
		callback();
  }
  _final(callback) {
  	const tekst= util.format('%s: insert: %d, update: %d, delete: %d\n\r', this.statname, this.stat.get('insert')||0, this.stat.get('update')||0, this.stat.get('delete')||0);
  	this.push(tekst);
		callback();
  }
}

//-----------------------------------------------------------------------------------------------------------------
// Analyser
//

function analyse(navn) {
	var stat = new StatTransform({objectMode: true, statname: navn});

	// stat.on('end', function (obj) {
	//  	console.log("%s - antal: %d, Tid: %d ms", stat.statname, stat.antal, Date.now()-start);
	// });

	// stat.on('finish', function (obj) {
	//   console.log("%s - finish: Antal: %d, Tid: %d ms", stat.statname, stat.antal, Date.now()-start);
	// });

	stat.on('error', function (err) {
	  console.log("%s - analyse error: %s", stat.statname, err);
	});

	return stat;
}

//console.log('før pipe');

//-----------------------------------------------------------------------------------------------------------------
// pipes
//
navngivenvejrequest.pipe(jsonparser('Navngivne veje')).pipe(analyse('Navngivne veje')).pipe(process.stdout);
vejrequest.pipe(jsonparser('Vejstykker')).pipe(analyse('Vejstykker')).pipe(process.stdout);
adresserequest.pipe(jsonparser('Adresser')).pipe(analyse('Adresse')).pipe(process.stdout);
adgangsadresserequest.pipe(jsonparser('Adgangsadresser')).pipe(analyse('Adgangsadresser')).pipe(process.stdout);