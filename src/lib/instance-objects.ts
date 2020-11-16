'use strict';

import util = require('util');

import * as c from './constants';

export async function setStateAsyncEx(that: any, _id: string, _value: any, _common: ioBroker.StateCommon)  {
	//that.log.debug('setStateAsyncEx started');
	try {
		await that.setObjectNotExistsAsync(_id, {
			type: 'state',
			common: _common,
			native: {},
		})
		.then((id: string) => {
			that.setStateAsync(id, _value, true);
			that.log.debug('setStateAsyncEx, set "' + id + '" to "' + _value + '"');})
		.catch((e: any) => that.log.error('error on "setStateAsyncEx() for id "' + _id + '": ' + e.message));

		//await that.setStateAsync(_id, _value, true);
	} catch (e) {
		that.log.error('error on "setStateAsyncEx()" for id "' + _id + '": ' + e.message);
	}

} // setStateAsyncEx()


export async function createInstanceRootObjects(that: any, table: string, tableGuest: string): Promise<void> { // this, c.HTML + c.HTML_END, c.HTML_GUEST + c.HTML_END
	that.log.debug('createInstanceRootObjects started');
	try {
		const getStateP = util.promisify(that.getState);

		const jStatesIndex = {
			id: 0,
			type: 1,
			name: 2,
			valType: 3,
			role: 4,
			val: 5,
			read: 6,
			write: 7,
			descr: 8
		};
	/*
		that.setObjectNotExistsAsync(
			'info',
			{
				type: 'channel',
				common: {
					name: 'information',
					role: 'info',
				},
				native: {},
			},
			function(err: any) {
				if (err) _this.log.error('Cannot write object: ' + err);
				else _this.log.debug('channel "info" created');
			},
		);
	*/
		let idName: string = c.dppFB_Info_SupportedFunctions.substr(0, c.dppFB_Info_SupportedFunctions.length - 1);
		that.setObjectNotExistsAsync(
			idName,
			{
				type: 'channel',
				common: {
					name: idName,
					role: 'info',
				},
				native: {},
			}
		);

		const aStates = [
			//common.type (aStatesional - (default is mixed==any type) (possible values: number, string, boolean, array, object, mixed, file)
			['info.connection', 'state', 'connection', 'boolean', 'indicator', false, true, false, 'Fritz!Boxx connection state'],
			['info.version', 'state', 'version', 'text', 'info', 0, true, false, 'Fritz!Box version'],
			['info.lastUpdate', 'state', 'lastUpdate', 'number', 'date', 0, true, false, 'last connection datetime'],
			['json', 'state', 'json', 'string', 'json', '[]', true, false, 'Json table'],
			['html', 'state', 'html', 'string', 'html', table, true, false, 'Html table'],
			['devices', 'state', 'devices', 'number', 'value', 0, true, false, 'Number of devices'],
			['activeDevices', 'state', 'activeDevices', 'number', 'value', 0, true, false, 'Number of active devices'],
			[c.dppFB_Info_SupportedFunctions + 'version', 'state', c.dppFB_Info_SupportedFunctions + 'version', 'string', 'info', '', true, false, c.dppFB_Info_SupportedFunctions + 'version'],
			[c.dppFB_Info_SupportedFunctions + 'name', 'state', c.dppFB_Info_SupportedFunctions + 'name', 'string', 'info', '', true, false, c.dppFB_Info_SupportedFunctions + 'name']
		];

		for(let i = 0; i < aStates.length; i++) { 
			await that.setObjectNotExists(aStates[i][jStatesIndex.id], {
				type: aStates[i][jStatesIndex.type],
				common: {
					name: aStates[i][jStatesIndex.name],
					type: aStates[i][jStatesIndex.valType],
					role: aStates[i][jStatesIndex.role],
					def: aStates[i][jStatesIndex.val],
					read: aStates[i][jStatesIndex.read],
					write: aStates[i][jStatesIndex.write],
					desc: aStates[i][jStatesIndex.descr],
				},
				native: {},
			});
			if (await getStateP(aStates[i][jStatesIndex.id]) == null) that.setState(aStates[i][jStatesIndex.id], aStates[i][jStatesIndex.val], true); //set default
		}

		that.log.debug('createInstanceRootObjects finished');
		
	} catch (e) {
		that.log.error('error on "createInstanceRootObjects()"; ' + e.message);
	}

} // createInstanceRootObjects(9)

