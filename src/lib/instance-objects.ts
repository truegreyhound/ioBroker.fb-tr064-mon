'use strict';

import util = require('util');

import * as c from './constants';

export async function setStateAsyncEx(that: any, _id: string, _value: any, _common: ioBroker.StateCommon, _setValueOnlyStateCreated: boolean = false, _setValueDelay: number = 0): Promise<boolean>  {
	that.log.debug('io.setStateAsyncEx started for id "' + _id + '"; value: ' + _value  + '; common: ' + JSON.stringify(_common) + '"; _setValueOnlyStateCreated: ' + _setValueOnlyStateCreated);

	let bValueChanged: boolean = false;

	try {
		return await that.setObjectNotExistsAsync(_id, {
			type: 'state',
			common: _common,
			native: {},
		})
		.then(async (err: Error, obj: any) => {
			that.log.debug('io.setStateAsyncEx, setObjectNotExistsAsync, id: ' + _id + '; err:' + JSON.stringify(obj) + '; obj:' + JSON.stringify(obj) + '<<<');
			// obj == undefined --> object aleady exist, obj == obj:{"id":"fb-tr064-mon.0.devices.iFranks.IP"} --> created

			if (err) that.log.error('setStateAsyncEx error: ' + JSON.stringify(err));

			if (!(err) && ((obj == undefined) && !(_setValueOnlyStateCreated)) || (obj != undefined)) {
				// state already exist -->  no value should be set || state new created --> set value
				if(_setValueDelay > 0) {
					await that.getStateAsync(_id)
					.then((obj:any) => {
						that.log.debug('io.getStateAsyncEx, getStateAsync(' + _id + '):' + JSON.stringify(obj) + '<<<');

						if(obj.val != _value) {
							bValueChanged = true;

							setTimeout(() => { 
								that.setStateAsync(_id, _value, true);
							}, _setValueDelay);
						}
					});
				} else {
					await that.setStateChangedAsync(_id, _value, true)
					.then((obj:any) => {
						that.log.debug('io.setStateAsyncEx, setStateChangedAsync, obj:' + JSON.stringify(obj) + '<<<');
						// obj:{"id":"fb-tr064-mon.0.devices.iFranks.IP","notChanged":true}
						
						bValueChanged = !obj.notChanged;
					});
					that.log.debug('io.setStateAsyncEx, set "' + _id + '" to "' + _value + '"');
					that.log.debug('io.setStateAsyncEx finished for id "' + _id + '" with bValueChanged: ' + bValueChanged);
				}
			} else {
				that.log.debug('io.setStateAsyncEx finished without set value for id "' + _id + '"');
			}

			return bValueChanged;
		})
		.catch((e: any) => that.log.error('io.setStateAsyncEx, error on "setStateAsyncEx() for id "' + _id + '": ' + e.message));

		//await that.setStateAsync(_id, _value, true);
	} catch (e) {
		that.log.error('io.setStateAsyncEx, error on "setStateAsyncEx()" for id "' + _id + '": ' + e.message);

		return bValueChanged;
	}

} // setStateAsyncEx()


export async function getStateValAsyncEx(that: any, _id: string, _value: any): Promise<ioBroker.State>  {
	try {
		return await that.getObjectAsync(_id)
		.then(async (objState: ioBroker.Object | null | undefined) => {
			that.log.debug('getStateValAsyncEx, getObjectAsync: ' + JSON.stringify(objState));

			let dpvState: ioBroker.State = _value;
			if(objState) {
				const dpoState = await that.getStateAsync(objState._id);
				that.log.debug('getStateValAsyncEx, dpoState: ' + JSON.stringify(dpoState));

				if(dpoState) dpvState = dpoState.val
			}

			that.log.debug('getStateValAsyncEx, return dpvState: ' + JSON.stringify(dpvState));

			return dpvState;
		})
		.catch((e: any) => {
			that.log.error('error on "getStateValAsyncEx() for id "' + _id + '": ' + e.message);

			return _value;
		});

	} catch (e) {
		that.log.error('error on "getStateValAsyncEx()" for id "' + _id + '": ' + e.message);

		return _value;
	}

	return _value;

} // getStateValAsyncEx()


//!P!export async function createInstanceRootObjects(that: any, table: string, tableGuest: string): Promise<void> { // this, c.HTML + c.HTML_END, c.HTML_GUEST + c.HTML_END
export async function createInstanceRootObjects(that: any): Promise<void> {
		that.log.debug('io.createInstanceRootObjects started');
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

		idName = c.dppDevices.substr(0, c.dppDevices.length - 1);
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
			// jStatesIndex --> id, type, namem, valType, role, val, read, write, descr
			// valType == common.type: default is mixed==any type, possible values: number, string, boolean, array, object, mixed, file
			['info.connection', 'state', 'connection', 'boolean', 'indicator', false, true, false, 'Fritz!Box connection state'],
			[c.idFritzBoxVersion, 'state', c.idFritzBoxVersion, 'string', 'info', 0, true, false, 'Fritz!Box version'],
			[c.idCountDevicesTotal, 'state', c.idCountDevicesTotal, 'number', 'value', 0, true, false, 'Number of devices'],
			[c.idCountDevicesActive, 'state', c.idCountDevicesActive, 'number', 'value', 0, true, false, 'Number of active devices'],

			[c.idCountDevicesActiveLAN, 'state', c.idCountDevicesActiveLAN, 'number', 'value', 0, true, false, 'Number of active LAN devices'],
			[c.idCountDevicesActiveWLAN, 'state', c.idCountDevicesActiveWLAN, 'number', 'value', 0, true, false, 'Number of active WLAN devices'],
			[c.idCountDevicesActiveGuests, 'state', c.idCountDevicesActiveGuests, 'number', 'value', 0, true, false, 'Number of active WLAN devices from guests'],
			[c.idSupportedFunctions_FritzBoxVersion, 'state', c.idSupportedFunctions_FritzBoxVersion, 'string', 'info', '', true, false, 'Fritz!Box version of last check of supported functions'],

			[c.idFritzBoxName, 'state', c.idFritzBoxName, 'string', 'info', '', true, false, 'Fritz!Box name'],
			[c.idFritzBoxIP, 'state', c.idFritzBoxIP, 'string', 'info', '', true, false, 'Fritz!Box ip address'],
			[c.idFritzBoxMAC, 'state', c.idFritzBoxMAC, 'string', 'info', '', true, false, 'Fritz!Box mac address'],

			[c.idDeviceListInactive_JSON, 'state', c.idDeviceListInactive_JSON, 'string', 'info', '[]', true, false, 'JSON table, all inactive devices'],
			[c.idDeviceListActive_JSON, 'state', c.idDeviceListActive_JSON, 'string', 'info', '[]', true, false, 'JSON table, all active devices'],
			[c.idDeviceListActiveLAN_JSON, 'state', c.idDeviceListActiveLAN_JSON, 'string', 'info', '[]', true, false, 'JSON table, all active LAN devices'],
			[c.idDeviceListActiveWLAN_JSON, 'state', c.idDeviceListActiveWLAN_JSON, 'string', 'info', '[]', true, false, 'JSON table, all active WLAN devices'],

			[c.idDeviceListActiveGuests_JSON, 'state', c.idDeviceListActiveGuests_JSON, 'string', 'info', '[]', true, false, 'JSON table, all active guests devices'],
			[c.idDeviceList_Warn_JSON, 'state', c.idDeviceList_Warn_JSON, 'string', 'info', '[]', true, false, 'JSON table, all watched devices'],
			[c.idDeviceList_Warn_active_JSON, 'state', c.idDeviceList_Warn_active_JSON, 'string', 'info', '[]', true, false, 'JSON table, all watched active devices'],
			[c.idDeviceList_Warn_inactive_JSON, 'state', c.idDeviceList_Warn_inactive_JSON, 'string', 'info', '[]', true, false, 'JSON table, all watched inactive devices'],

			[c.idDeviceList_NewAddedDevices_JSON, 'state', c.idDeviceList_NewAddedDevices_JSON, 'string', 'info', '[]', true, false, 'JSON table, all new added device from Fritz!Box'],
			[c.idDeviceList_RemovedDevices_JSON, 'state', c.idDeviceList_RemovedDevices_JSON, 'string', 'info', '[]', true, false, 'JSON table, all removed devices from Fritz!Box network list'],
			[c.idDeviceList_DailyChanges_JSON, 'state', c.idDeviceList_DailyChanges_JSON, 'string', 'info', '[]', true, false, 'JSON table, added, changed and remove devices on each day'],
			[c.idDeviceList_DailyChanges_count, 'state', c.idDeviceList_DailyChanges_count, 'number', 'info', 0, true, true, 'item count in daily changes table'],
			[c.idDeviceList_DailyChanges_maxCount, 'state', c.idDeviceList_DailyChanges_maxCount, 'number', 'info', 100, true, true, 'max item count in daily changes table'],

			[c.idDeviceList_CachedDevices_JSON, 'state', c.idDeviceList_CachedDevices_JSON, 'string', 'info', '[]', true, false, 'JSON table, with all devices and configuration datam internal cache'],
			[c.idDeviceList_View_JSON, 'state', c.idDeviceList_View_JSON, 'string', 'info', '[]', true, false, 'JSON table for viewing in VIS e.g.'],
			[c.idDeviceList_View_JSON_Count, 'state', c.idDeviceList_View_JSON_Count, 'number', 'info', 0, true, false, 'Item count of viewing JSON table'],
			[c.idDeviceList_View_Name, 'state', c.idDeviceList_View_Name, 'string', 'info', 'allDevices', true, false, 'Input selector to toggle JSON table for viewing'],

			[c.idDeviceList_ActiveChanged, 'state', c.idDeviceList_ActiveChanged, 'boolean', 'info', false, true, false, 'active has changed'],
			[c.idDeviceList_IPChanged, 'state', c.idDeviceList_IPChanged, 'boolean', 'info', false, true, false, 'ip address has changed'],
			[c.idDeviceList_OwnerChanged, 'state', c.idDeviceList_OwnerChanged, 'boolean', 'info', false, true, false, 'owner name has changed'],
			[c.idDeviceList_WarnChanged, 'state', c.idDeviceList_WarnChanged, 'boolean', 'info', false, true, false, 'warn state has changed'],
			[c.idDeviceList_WatchChanged, 'state', c.idDeviceList_WatchChanged, 'boolean', 'info', false, true, false, 'watch state has changed']
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

		that.log.debug('io.createInstanceRootObjects finished');
		
	} catch (e) {
		that.log.error('error on "io.createInstanceRootObjects()"; ' + e.message);
	}

} // createInstanceRootObjects()


/*
	aktualisiert die device list für die Konfigurationsansicht

	aCfgDevicesList - aktuelle config-deviceList
	aAllDevices		- aktuelle List von der Fritz!Box
*/
//export async function updateDevices(that: any, aCfgDevicesList: JSON[], aAllActiveDevices: JSON[]) {
export async function updateDevices(that: any, aCfgDevicesList: c.IDevice[], aAllDevices: c.ICachedDevice[]) {
	const fctNameId: string = 'io.updateDevices';
	that.log.debug(fctNameId + ' started');
	that.log.debug(fctNameId + ', aAllActiveDevices: ' + JSON.stringify(aAllDevices));

	/*!P!#4
	Wenn neue Option "delete unwatched" aktiv, dann  über Selector DP-Liste erstellen und beim Durchlauf verarbeitete löschen
	nach Durchlauf alle DPs in Liste löschen
	*/
	let bDataChangedIP: boolean = false;
	let bDataChangedOwner: boolean = false;
	let bDataChangedWarn: boolean = false;
	let bDataChangedWatch: boolean = false;

	let aCfgDevicesListOld: any = null;
	if (that.config.devicesListOld) aCfgDevicesListOld = JSON.parse(JSON.stringify(that.config.devicesListOld));			// list from last confiuration on admin site
	//!D!that.log.debug(fctNameId + ', aCfgDevicesListOld: ' + JSON.stringify(aCfgDevicesListOld));

	if (!aCfgDevicesListOld) {
		aCfgDevicesListOld = JSON.parse(JSON.stringify(aCfgDevicesList));
	}
	that.log.debug(fctNameId + ', aCfgDevicesListOld2: ' + JSON.stringify(aCfgDevicesListOld));
	
	aCfgDevicesList.map( async (oCfgDevice: c.IDevice) => {
		that.log.debug(fctNameId + ', oCfgDevice: ' + JSON.stringify(oCfgDevice));
		// {"devicename":"Acer-NB","macaddress":"00:1C:26:7D:02:D6","ipaddress":"192.168.200.157","ownername":"","interfacetype":"","active":false,"watch":true}

		let oDeviceData: c.ICachedDevice;
		const oCfgDeviceOld: c.IDevice = aCfgDevicesListOld.find((item: c.IDevice) => { return ((item.macaddress && item.macaddress === oCfgDevice.macaddress) || (item.ipaddress && item.ipaddress === oCfgDevice.ipaddress));});
		
		that.log.debug(fctNameId + ', oCfgDeviceOld: ' + JSON.stringify(oCfgDeviceOld));
		
		if (oCfgDevice.macaddress == '') {
			oDeviceData = <c.ICachedDevice>aAllDevices.find(function (item: any) { return item.IPAddress === oCfgDevice.ipaddress;});

			//!P!#3 hier müsste ein Mechanismus rein, der diesen Meldungstype nach n Meldungen für den Tag abschaltet; that.log.warn('device "' + oCfgDevice.devicename + '" without MAC address; IP: "' + oDeviceData.IPAddress + '"');
		} else {
			oDeviceData = <c.ICachedDevice>aAllDevices.find(function (item: any) { return item.MACAddress === oCfgDevice.macaddress;});
		}

		if (oCfgDevice.watch) {
			// device watched, create datapoints / update value

			check_set_deviceData(that, oCfgDevice, oDeviceData);
		}

		if (oCfgDevice.warn) {
			// warn if device goes off
			if (oCfgDevice.active != oDeviceData.Active && oDeviceData.Active == true) {
				// device goes off
				that.log.warn('device "' + oCfgDevice.devicename + '" goes off');
			}
		}

		const idx: number = aCfgDevicesList.indexOf(oCfgDevice);
		aCfgDevicesList[idx].new = false;
		aCfgDevicesList[idx].changed = false;

		if (oDeviceData) {
			if (oDeviceData.IPAddress != oCfgDevice.ipaddress) {
				// IP has changed
				if(that.config.warningDestination == 'log')
				{
					that.log.warn('IP-address for device "' + oCfgDevice.devicename + '" changed (old: "' + oCfgDevice.ipaddress + '"; new: "' + oDeviceData.IPAddress + '"; MAC: "' + oDeviceData.MACAddress + '"');
				}

				if(that.config.warningDestination == 'telegram.0')
				{
					that.sendTo('telegram.0', (new Date(), "JJJJ.MM.TT SS:mm:ss") + ' MAC-address for device "' + oCfgDevice.devicename + '" changed (old: "' + oCfgDevice.ipaddress + '"; new: "' + oDeviceData.IPAddress + '"; MAC: "' + oDeviceData.MACAddress + '"');
				}

				// update aCfgDevicesList
				if (idx >= 0) {
					aCfgDevicesList[idx].ipaddress = oDeviceData.IPAddress;
					aCfgDevicesList[idx].changed = true;
					bDataChangedIP = true;
				}
			}

			if (oCfgDeviceOld) {
				if (oCfgDeviceOld.devicename != oCfgDevice.devicename) {		// device name has changed (bases on MAC / IP) --> remove old data
					// check device exist
					await that.getObjectAsync(c.dppDevices + oCfgDeviceOld.devicename)
					.then( async (oDevice: any) => {
						if (oDevice) {
							that.log.debug(fctNameId + ', getObjectAsync; node "' + c.dppDevices + oCfgDeviceOld.devicename + '" for device exist');
					
							// save old dates
							await copy_oldDeviceData(that, oCfgDeviceOld, oCfgDevice);

							// remove old device object
							// !P! ggf. Option, ob das passieren soll
							delete_oldDeviceData(that, oCfgDeviceOld);
						} else {
							that.log.debug(fctNameId + ', getObjectAsync; old node "' + c.dppDevices + oCfgDeviceOld.devicename + '" for device does`t exist');
						}
					});
				}
				if (oCfgDeviceOld.ownername != oCfgDevice.ownername) {
					// owner has changed
					bDataChangedOwner = true;
				}
				if (oCfgDeviceOld.warn != oCfgDevice.warn) {
					// warn has changed
					bDataChangedWarn = true;
				}
				if (oCfgDeviceOld.watch != oCfgDevice.watch) {
					// watch has changed
					bDataChangedWatch = true;
				}
			}
		}
	});

	if (bDataChangedIP || bDataChangedOwner || bDataChangedWarn || bDataChangedWatch) that.config.devicesList = aCfgDevicesList;
	that.config.devicesListIPChanged = bDataChangedIP;
	that.config.devicesListOwnerChanged = bDataChangedOwner;
	that.config.devicesListWarnChanged = bDataChangedWarn;
	that.config.devicesListWatchChanged = bDataChangedWatch;

	that.config.devicesListOld = JSON.parse(JSON.stringify(that.config.devicesList));
	that.log.debug(fctNameId + ', config.devicesListOld: ' + JSON.stringify(that.config.devicesListOld));

	that.log.debug(fctNameId + ' finished');
} // updateDevices()


async function check_set_deviceData(that: any, oCfgDevice: c.IDevice, oDeviceData: c.ICachedDevice) {
	// check data points exist: active, IP, lastIP, MAC, lastMAC, lastActive, lastInactive
	// and update there values
	// Wenn MAC oder IP sich ändert, Message, wenn enabled

	const fctNameId: string = 'io.check_set_deviceData';
	that.log.debug(fctNameId + ' started for oCfgDevice: ' + JSON.stringify(oCfgDevice));
	that.log.debug(fctNameId + ' started for oDeviceData: ' + JSON.stringify(oDeviceData));
	// oCfgDevice: {"devicename":"iFranks","macaddress":"C8:3C:85:63:DC:83","ipaddress":"192.168.200.146","new":false,"changed":false,"ownername":"Frank","interfacetype":"802.11","warn":false,"watch":true}
	// oDeviceData: {"State":"changed","DeviceName":"iFranks","Active":true,"Active_lc":1607980907210,"Inactive_lc":0,"HostName":"iFranks","HostName_lc":0,"IPAddress":"192.168.200.146","IPAddress_lc":0,"MACAddress":"C8:3C:85:63:DC:83","Interfacetype":"802.11","Guest":false,"Port":0,"Speed":351,"ts":1607980907209,"Warn":false,"Watch":true}

	try {
		that.log.debug(fctNameId + ', create device "' + c.dppDevices + oCfgDevice.devicename + '"')
		// create device node
		that.setObjectNotExistsAsync(
			c.dppDevices + oCfgDevice.devicename,
			{
				type: 'device',
				common: {
					name: oCfgDevice.devicename,
					role: 'info',
				},
				native: {},
			}
		);
	}  catch(err) {
		that.log.error(fctNameId + ', error on create device for id "' + c.dppDevices + oCfgDevice.devicename + '": ' + err.message)
	}
	
	try {
		let idState: string = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceActive;
		let idStateValue: any = ((oDeviceData) && (oDeviceData.Active) ? true : false);
		const dtCurrent: number = (new Date()).getTime();
		that.log.debug(fctNameId + ', create state "' + idState + '"; set value: "' + idStateValue + '"; oDeviceData: ' + JSON.stringify(oDeviceData));

		let bValueChanged: boolean = await setStateAsyncEx(that, idState, idStateValue, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceActive,
			type: 'boolean',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceActive,
		}, false, 200);		// set value with delay
		if (bValueChanged) that.log.warn(fctNameId + ', id "' + idState + '"; set value: "' + idStateValue + '"');

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive;
		await setStateAsyncEx(that, idState, 0, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceLastActive,
			type: 'number',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceLastActive,
		}, true);	// set "0" only, if state new created

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive;
		await setStateAsyncEx(that, idState, 0, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceLastInactive,
			type: 'number',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceLastInactive,
		}, true);	// set "0" only, if state new created

		if (bValueChanged) {
			// value has changed
			if(idStateValue) {
				idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive;

				that.setStateAsync(idState, dtCurrent);
			} else {
				idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive;

				that.setStateAsync(idState, dtCurrent);
			}
			that.log.debug(fctNameId + ', idState "' + idState + '"; set value dtCurrent while state changed: "' + dtCurrent + '" (' + that.formatDate(dtCurrent, 'YYYY.MM.DD SS:mm:ss'));
		} else {
			// wenn der Wert sich nicht geändert hat, muss idnDeviceLastActive | idnDeviceLastInactive > idnDeviceLastInactive | idnDeviceLastActive
			// wenn nicht, dann gab es eine "Überwachungspause", d. h., diese Werte sollten trotzdem aktualisiert werden
			await that.getStateAsync(c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive)
			.then(async (oStateLA: any) => {
				that.log.debug(fctNameId + ', getStateAsyncEx(' + c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive + '):' + JSON.stringify(oStateLA) + '<<<');
		
				if (oStateLA) {
					await that.getStateAsync(c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive)
					.then((oStateLI: any) => {
						that.log.debug(fctNameId + ', getStateAsyncEx(' + c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive + '):' + JSON.stringify(oStateLI) + '<<<');
				
						if (oStateLI) {
							that.log.debug(fctNameId + ', check consistent date active/inactive: ' + oStateLA.val + ' / ' + oStateLI.val);

							if(idStateValue) {
								// true --> idnDeviceLastActive > idnDeviceLastInactive
								bValueChanged = (oStateLA.val < oStateLI.val);		// true, if inconsistent value
							} else {
								bValueChanged = (oStateLI.val < oStateLA.val);		// true, if inconsistent value
							}

							if (bValueChanged) {
								// date to old, update
								if(idStateValue) {
									idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive;
					
									that.setStateAsync(idState, dtCurrent);
								} else {
									idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive;
					
									that.setStateAsync(idState, dtCurrent);
								}
								that.log.debug(fctNameId + ', idState "' + idState + '"; set value dtCcurrent while date active/inactive inconsistent: "' + dtCurrent + '" (' + that.formatDate(dtCurrent, 'YYYY.MM.DD SS:mm:ss'));
							}
					
					
						} else {
							that.log.warn(fctNameId + ', getStateAsyncEx: object not found!');
						}
					});
						} else {
					that.log.warn(fctNameId + ', getStateAsyncEx: object not found!');
				}
			});
		}

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceName;
		setStateAsyncEx(that, idState, oCfgDevice.devicename, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceName,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceName,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceHostname;
		setStateAsyncEx(that, idState, ((oDeviceData) ? oDeviceData.HostName : ''), {
			name: oCfgDevice.devicename + '.' + c.idnDeviceHostname,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceHostname,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceMAC;
		setStateAsyncEx(that, idState, ((oDeviceData) ? oDeviceData.MACAddress : oCfgDevice.macaddress), {
			name: oCfgDevice.devicename + '.' + c.idnDeviceMAC,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceMAC,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastMAC;
		setStateAsyncEx(that, idState, oCfgDevice.macaddress, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceLastMAC,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceLastMAC,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceIP;
		setStateAsyncEx(that, idState, ((oDeviceData) ? oDeviceData.IPAddress : oCfgDevice.ipaddress), {
			name: oCfgDevice.devicename + '.' + c.idnDeviceIP,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceIP,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastIP;
		idStateValue = oCfgDevice.ipaddress;
		that.log.debug(fctNameId + ', create state "' + idState + '"; set value: "' + idStateValue);
		setStateAsyncEx(that, idState, idStateValue, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceLastIP,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceLastIP,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceOwner;
		setStateAsyncEx(that, idState, oCfgDevice.ownername, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceOwner,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceOwner,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceInterfaceType;
		setStateAsyncEx(that, idState, ((oDeviceData) && oDeviceData.Interfacetype != '' ? oDeviceData.Interfacetype : oCfgDevice.interfacetype), {
			name: oCfgDevice.devicename + '.' + c.idnDeviceInterfaceType,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceInterfaceType,
		});

		// '{"IPAddress": "' + oDevice.IPAddress + '", "MACAddress": "' + oDevice.MACAddress + '", "HostName": "' + oDevice.HostName + '"'
		//  ', "InterfaceType": "' + oDevice.InterfaceType + '", "Port": "' + oDevice['X_AVM-DE_Port'] + '", "Speed": "' + oDevice['X_AVM-DE_Speed'] + '"}';

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbPort;
		idStateValue = ((oDeviceData) ? oDeviceData.Port : '');
		that.log.debug(fctNameId + ', create state "' + idState + '"; set value: "' + idStateValue);
		setStateAsyncEx(that, idState, idStateValue, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceFbPort,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceFbPort,
		});

		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbSpeed;
		setStateAsyncEx(that, idState, ((oDeviceData) && (oDeviceData.Speed)) ? oDeviceData.Speed : 0, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceFbSpeed,
			type: 'string',
			role: 'info',
			def: '',
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceFbSpeed,
		});
		
		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbGuest;
		setStateAsyncEx(that, idState, (((oDeviceData) && (oDeviceData.Guest)) ? true : false), {
			name: oCfgDevice.devicename + '.' + c.idnDeviceFbGuest,
			type: 'boolean',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceFbGuest,
		});
		
		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbWarn;
		setStateAsyncEx(that, idState, oCfgDevice.warn, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceFbWarn,
			type: 'boolean',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceFbWarn,
		});
		
		idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbWatch;
		setStateAsyncEx(that, idState, oCfgDevice.watch, {
			name: oCfgDevice.devicename + '.' + c.idnDeviceFbWatch,
			type: 'boolean',
			role: 'info',
			def: false,
			read: true,
			write: false,
			desc: oCfgDevice.devicename + '.' + c.idnDeviceFbWatch,
		});
	}  catch(err) {
		that.log.error(fctNameId + ', error on create state for device "' + c.dppDevices + oCfgDevice.devicename + '": ' + err.message)
	}

} // check_set_deviceData()


async function copy_oldDeviceData(that: any, oCfgDeviceOld: c.IDevice, oCfgDevice: c.IDevice) {
	// lastActive, lastInactive übernehmen
	const fctNameId: string = 'io.copy_oldDeviceData';
	that.log.debug(fctNameId + ' started for oCfgDeviceOld: ' + JSON.stringify(oCfgDeviceOld));

	that.log.debug(fctNameId + ', getStateAsyncEx(' + c.dppDevices + oCfgDeviceOld.devicename + '.' + c.idnDeviceLastActive + ')');

	await that.getStateAsync(c.dppDevices + oCfgDeviceOld.devicename + '.' + c.idnDeviceLastActive)
	.then((oState: any) => {
		that.log.debug(fctNameId + ', getStateAsyncEx; oState:' + JSON.stringify(oState) + '<<<');

		if (oState) {
			that.setStateAsync(c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive, oState.val, true);
		} else {
			that.log.warn(fctNameId + ', getStateAsyncEx: object not found!');
		}
	});

	that.log.debug(fctNameId + ', getStateAsyncEx(' + c.dppDevices + oCfgDeviceOld.devicename + '.' + c.idnDeviceLastInactive + ')');

	await that.getStateAsync(c.dppDevices + oCfgDeviceOld.devicename + '.' + c.idnDeviceLastInactive)
	.then((oState: any) => {
		that.log.debug(fctNameId + ', getStateAsyncEx; oState:' + JSON.stringify(oState) + '<<<');

		if (oState) {
			that.setStateAsync(c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive, oState.val, true);
		} else {
			that.log.warn(fctNameId + ', getStateAsyncEx: object not found!');
		}
	});

	that.log.debug(fctNameId + ' finished');

} // copy_oldDeviceData()


async function delete_oldDeviceData(that: any, oCfgDevice: c.IDevice) {
	// remove old objects for XXXX active, IP, lastIP, MAC, lastMAC, lastActive, lastInactive

	const fctNameId: string = 'io.delete_oldDeviceData';
	that.log.debug(fctNameId + ' started for oCfgDevice: ' + JSON.stringify(oCfgDevice));
	//oCfgDevice: {"devicename":"Acer-NB","macaddress":"00:1C:26:7D:02:D6","ipaddress":"192.168.200.157","ownername":"","interfacetype":"","active":false,"watch":true}
	
/*!PI! deleteDeviceAsync funktioniert nicht, da unter devices zuerst channels gesucht werden	try {
		that.log.debug(fctNameId + ', delete device "' + c.dppDevices + oCfgDevice.devicename + '"')
		// delete device node
		that.deleteDeviceAsync(c.dppDevices + oCfgDevice.devicename, (err: Error) => {
			if (err) that.log.error(fctNameId + ', error on deleting device for id "' + c.dppDevices + oCfgDevice.devicename + '": ' + JSON.stringify(err))
		});
	}  catch(err) {
		that.log.error(fctNameId + ', error on deleting device for id "' + c.dppDevices + oCfgDevice.devicename + '": ' + err.message)
	}
*/

try {

	//!P! ID aus getObjets des device ermitteln

	let idState: string = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceActive;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastActive;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastInactive;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceName;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceHostname;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceMAC;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastMAC;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceIP;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceLastIP;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceOwner;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceInterfaceType;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbPort;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbSpeed;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbGuest;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbWarn;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename + '.' + c.idnDeviceFbWatch;
	that.log.debug(fctNameId + ', delete state "' + idState + '"');
	that.delObjectAsync(idState);

	idState = c.dppDevices + oCfgDevice.devicename;
	that.log.debug(fctNameId + ', delete device "' + idState + '"');
	that.delObjectAsync(idState);

	// remove from adapter config list
	
	const nIdxDL: number = that.config.devicesList.findIndex((item: any) => ((item.macaddress && item.macaddress === oCfgDevice.macaddress) || (item.ipaddress && item.ipaddress === oCfgDevice.ipaddress)));
	that.log.silly(fctNameId + ', maChangedDevices.findIndex: ' + nIdxDL);

	if (nIdxDL >= 0) {
		that.config.devicesList.splice(nIdxDL, 1);
	} else {
		that.log.error(fctNameId + ', item in config.devicesList not found! Parameter error?');
	}
}  catch(err) {
	that.log.error(fctNameId + ', error on create state for device "' + c.dppDevices + oCfgDevice.devicename + '": ' + err.message)
}

	that.log.debug(fctNameId + ' finished');

} // delete_oldDeviceData()
