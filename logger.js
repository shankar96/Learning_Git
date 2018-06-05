'use strict';

const bunyan = require('bunyan');

const logConf = {
	"path": "public/alexa.log",
	"level": "DEBUG"
};
const Elasticsearch = require('bunyan-elasticsearch');

const esStream = new Elasticsearch({
	indexPattern: '[t2s-]YYYY.MM.DD',
	type: 'logs',
	host: logConf.host
});
esStream.on('error', function(err) {
	log.info('Elasticsearch Stream Error:', err.stack);
});


let streams = [];
let stdStream = {
	level: 'info',
	stream: process.stdout // log INFO and above to stdout
}
let stdStream1 = {
	level: 'debug',
	stream: process.stdout // log INFO and above to stdout
}
let stdStream2 = {
	level: 'error',
	stream: process.stdout // log INFO and above to stdout
}
let stdStream3 = {
	level: 'warn',
	stream: process.stdout // log INFO and above to stdout
}
// streams.push(stdStream);
streams.push(stdStream1);
// streams.push(stdStream2);
// streams.push(stdStream3);

if (process.env.LOG_TO_FILE && JSON.parse(process.env.LOG_TO_FILE)) {
	let fileStream = {
		path: logConf.path,
		level: logConf.level
	};
	streams.push(fileStream);
} else{
  console.log("Still log in file")
 let fileStream = {
		path: logConf.path,
		level: logConf.level
	};
	streams.push(fileStream);
}

function getLogger() {
	let log = bunyan.createLogger({
		name: 't2s',
		src: true,
		streams: streams,
		serializers: bunyan.stdSerializers
	});
	return log;
}
let log = getLogger();

module.exports = log;