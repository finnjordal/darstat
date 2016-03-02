
var program = require('commander')
	,rp = require('request-promise')
	,moment = require('moment');
 

program
  .version('0.0.1')
  .usage('[options]')
  .option('-d, --døgn [antal]', 'seneste døgn (default: 1)')
  .option('-å, --år [årstal]ß', 'ønskede år')
  .option('-æ, --ændret', 'ændrede')
  .option('-s, --slet', 'slettede')
  .parse(process.argv);

moment.locale('da');

var host= "http://dawa.aws.dk";

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
	fra= moment({year: år, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0});;
	til= moment({year: år+1, month: 1, day: 1, hour: 0, minute: 0, second: 0, millisecond: 0});; 
}

console.log('antal døgn: %d', antaldøgn);

var vejoption= {};
    vejoption.baseUrl= host;
    vejoption.url='/replikering/vejstykker/haendelser';
    vejoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var vejrequest= rp(vejoption);

var adresseoption= {};
    adresseoption.baseUrl= host;
    adresseoption.url='/replikering/adresser/haendelser';
    adresseoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var adresserequest= rp(adresseoption);

var adgangsadresseoption= {};
    adgangsadresseoption.baseUrl= host;
    adgangsadresseoption.url='/replikering/adgangsadresser/haendelser';
    adgangsadresseoption.qs= {tidspunktfra: fra.utc().toISOString(), tidspunkttil: til.utc().toISOString()};
var adgangsadresserequest= rp(adgangsadresseoption);


Promise.all([vejrequest, adgangsadresserequest, adresserequest])
	.then(function(svar) {
		vejnavne= JSON.parse(svar[0]);
		const vejnavnestat = new Map();
		vejnavne.forEach(function(vejnavn) {
			const count = vejnavnestat.get(vejnavn.operation) || 0;
    	vejnavnestat.set(vejnavn.operation, count + 1);
			//console.log("%s %s %s (%s), %s (%s)" ,moment(vejnavn.tidspunkt).local().format('LLL'),vejnavn.operation,vejnavn.data.navn,vejnavn.data.kode,vejnavn.data.kommunenavn,vejnavn.data.kommunekode);
		})
		console.log('Vejstykker: insert: %d, update: %d, delete: %d', vejnavnestat.get('insert')||0, vejnavnestat.get('update')||0, vejnavnestat.get('delete')||0);
		
		adgangsadresser= JSON.parse(svar[1]);
		const adgangsadresserstat = new Map();
		adgangsadresser.forEach(function(vejnavn) {
			const count = adgangsadresserstat.get(vejnavn.operation) || 0;
    	adgangsadresserstat.set(vejnavn.operation, count + 1);
			//console.log("%s %s %s (%s), %s (%s)" ,moment(vejnavn.tidspunkt).local().format('LLL'),vejnavn.operation,vejnavn.data.navn,vejnavn.data.kode,vejnavn.data.kommunenavn,vejnavn.data.kommunekode);
		})
		console.log('Adgangsadresser: insert: %d, update: %d, delete: %d', adgangsadresserstat.get('insert')||0, adgangsadresserstat.get('update')||0, adgangsadresserstat.get('delete')||0);
		
		adresser= JSON.parse(svar[2]);
		const adresserstat = new Map();
		adresser.forEach(function(vejnavn) {
			const count = adresserstat.get(vejnavn.operation) || 0;
    	adresserstat.set(vejnavn.operation, count + 1);
			//console.log("%s %s %s (%s), %s (%s)" ,moment(vejnavn.tidspunkt).local().format('LLL'),vejnavn.operation,vejnavn.data.navn,vejnavn.data.kode,vejnavn.data.kommunenavn,vejnavn.data.kommunekode);
		})
		console.log('Adresser: insert: %d, update: %d, delete: %d', adresserstat.get('insert')||0, adresserstat.get('update')||0, adresserstat.get('delete')||0);
	})
	.catch(function(error) {	  			
		console.log('all Fejl: '+error);
	})