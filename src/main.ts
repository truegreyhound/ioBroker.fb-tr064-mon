/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/camelcase */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.21.0
 */

/* !P!
device K3 D8:50:E6:D3:07:87 192.168.200.109 > wird interface Ethernet nicht entfern, obwohl nicht im Netz
IP-address for device "influx-01" changed (old: "192.168.200.105"; new: "192.168.200.107"; MAC: "90:1B:0E:BA:80:82" > kann es sein, dass das intern nicht aktualisiert wird?  IPlast

Was wenn angelegtes device watch deaktiviert wird? Properties watch und warn als DP und diesen dann auf FALSE?? oder DP löschen?


	Option in Konfigurationsseite, ob aktuelle Uhrzeit für lastActive/lastInactive bei Neuanlage eines Gerätes genommen werden soll, 0 ist wahrscheinlich bresser/eindeutig
	Option in Konfigurationsseite, ob aus der Überwachung fallende Geräte gelöscht werden sollen
	Option, ob bei Änderung von MAC/IP eine Warnung gesendet/geloggt werden soll
	Option in der Liste, ob bei einem Gerät, das Offline geht, eine Warnung gesendet/geloggt werden soll, unabhängig ob das Gerät Überwacht (watched) wird
*/

/* !I!
	"Friend" ist der festgelegte Ownername für Geräte der Freunde.
*/


// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here, e.g.:
// import * as fs from 'fs';
// load your modules here, e.g.:

import util = require('util');
import dateFormat = require('dateformat');
import {parse, stringify} from 'flatted';

//own libraries
import * as c from './lib/constants';
import * as mFb from './lib/fb';
//import mFb = require('./lib/fb');
import mFbObj = require('./lib/instance-objects');
import { adapter } from '@iobroker/adapter-core';
import Flatted = require('flatted');


let maAllDevices: JSON[] = [];
let mScheduleStatus: any = null;
let mFbClass: mFb.Fb;


async function getDeviceList(that: any, cfg: any, Fb: mFb.Fb): Promise<any> {
	const fctName: string = 'getDeviceList';
	that.log.debug(fctName + ' started');

	try {
		//get device list
		const sHostPath: any = await Fb.soapAction(Fb, '/upnp/control/hosts', c.URN + 'Hosts:1', c.X_AVM_DE_GetHostListPath, null);
		that.log.debug(fctName + ', sHostPath: ' + JSON.stringify(sHostPath) + '; typeof: ' + typeof sHostPath);

		const sUrl: string = 'http://' + Fb.host + ':' + Fb.port + sHostPath['NewX_AVM-DE_HostListPath'];
		that.log.debug(fctName + ', sUrl : ' + sUrl);

		const deviceList = await Fb.getDeviceList(sUrl);

		//that.log.debug(fctName + ', deviceList: ' + JSON.stringify(deviceList) + '; typeof: ' + typeof deviceList);
		//that.log.debug(fctName + ', deviceList["List"]["Item"]: ' + JSON.stringify(deviceList['List']['Item']));

		//!P! ?? let errorCnt: number = 0;

		that.setStateChangedAsync('info.connection', { val: true, ack: true });			//Fritzbox connection established
		//that.setState('info.connection', true, true); //Fritzbox connection established
		that.log.debug(fctName + ', setState("info.connection", TRUE)');

		that.log.debug(fctName + ' finished');

		return deviceList['List']['Item'];

	}  catch (e) {
		//!P! showError(fctName + ': '+e.message);
		that.log.error(fctName + ': ' + e.message);

		return null;
	}

	that.log.debug(fctName + ' finished undefined');

} // getDeviceList()


function createDeviceStatusLists(that: any, aDevices: any) {
	const fctName: string = 'createDeviceStatusLists';
	that.log.debug(fctName + ' started');

	try {
		let aAllActiveDevices: JSON[] = [];
		let aAllActiveLANDevices: JSON[] = [];
		let aAllActiveWLANDevices: JSON[] = [];
		let aAllActiveGuestsDevices: JSON[] = [];
		let aAllInactiveDevices: JSON[] = [];
		let aDeviceList_Warn: JSON[] = [];
		let aDeviceList_Warn_active: JSON[] = [];
		let aDeviceList_Warn_inactive: JSON[] = [];

		maAllDevices = [];

		const sDeviceExt: string = ', "InterfaceType": "", "Port": "", "Speed": "0"}';

		aDevices.map(function(oDevice: any) {
			that.log.debug(fctName + ', oDevice: ' + JSON.stringify(oDevice));
			//!P!that.log.debug(fctName + ' oDevice.HostName: ' + oDevice.HostName + '; mFbClass.name: ' + mFbClass.name);
			// oDevice.HostName: sony-player; mFbClass.name: 

			const oCfgData: c.IDevice = <c.IDevice>that.config.devicesList.find(function (item: any) { return item.macaddress === oDevice.MACAddress;});
			that.log.debug(fctName + ', oCfgData: ' + JSON.stringify(oCfgData));

			if(oDevice.IPAddress == that.config.fb_ip) {
				// self
				that.setStateChangedAsync(c.idFritzBoxIP, oDevice.IPAddress);
				that.setStateChangedAsync(c.idFritzBoxMAC, oDevice.MACAddress);
			} else {
				let sDevice: string = '{"Active": "' + (oDevice.Active  == '1' ? true : false) + '", "IPAddress": "' + oDevice.IPAddress + '", "MACAddress": "' + oDevice.MACAddress + '", "HostName": "' + oDevice.HostName + '"'
				
				if(oCfgData.warn == true) aDeviceList_Warn.push(JSON.parse(sDevice));

				if (oDevice.Active == "0") {		// inactive
					aAllInactiveDevices.push(JSON.parse(sDevice + '}'));
					maAllDevices.push(JSON.parse(sDevice + sDeviceExt));

					if(oCfgData.warn == true) aDeviceList_Warn_inactive.push(JSON.parse(sDevice));
				} else {
					// device active
					sDevice += ', "InterfaceType": "' + oDevice.InterfaceType + '", "Port": "' + oDevice['X_AVM-DE_Port'] + '", "Speed": "' + oDevice['X_AVM-DE_Speed'] + '", "Guest": "' + oDevice['X_AVM-DE_Guest'] + '"}';

					maAllDevices.push(JSON.parse(sDevice));
					aAllActiveDevices.push(JSON.parse(sDevice));

					if(oDevice.InterfaceType == 'Ethernet') aAllActiveLANDevices.push(JSON.parse(sDevice));
					if(oDevice.InterfaceType == '802.11') aAllActiveWLANDevices.push(JSON.parse(sDevice));
					if(oDevice.Guest == '1') aAllActiveGuestsDevices.push(JSON.parse(sDevice));
					if(oCfgData.warn == true) aDeviceList_Warn_active.push(JSON.parse(sDevice));
				}
			}
		});

		// write data to data points
		that.setStateChangedAsync(c.idDeviceListAll_JSON, JSON.stringify(maAllDevices));
		that.setStateChangedAsync(c.idDeviceListInactive_JSON, JSON.stringify(aAllInactiveDevices));
		that.setStateChangedAsync(c.idDeviceListActive_JSON, JSON.stringify(aAllActiveDevices));
		that.setStateChangedAsync(c.idDeviceListActiveLAN_JSON, JSON.stringify(aAllActiveLANDevices));
		that.setStateChangedAsync(c.idDeviceListActiveWLAN_JSON, JSON.stringify(aAllActiveWLANDevices));
		that.setStateChangedAsync(c.idDeviceListActiveGuests_JSON, JSON.stringify(aAllActiveGuestsDevices));

		that.setStateChangedAsync(c.idDeviceList_Warn_JSON, JSON.stringify(aDeviceList_Warn));
		that.setStateChangedAsync(c.idDeviceList_Warn_active_JSON, JSON.stringify(aDeviceList_Warn_active));
		that.setStateChangedAsync(c.idDeviceList_Warn_inactive_JSON, JSON.stringify(aDeviceList_Warn_inactive));

		that.setStateChangedAsync(c.idCountDevicesTotal, maAllDevices.length);
		that.setStateChangedAsync(c.idCountDevicesActive, aAllActiveDevices.length);
		that.setStateChangedAsync(c.idCountDevicesActiveLAN, aAllActiveLANDevices.length);
		that.setStateChangedAsync(c.idCountDevicesActiveWLAN, aAllActiveWLANDevices.length);
		//that.log.debug(fctName + ', aAllActiveGuestsDevices.length: ' + JSON.stringify(aAllActiveGuestsDevices.length));
		that.setStateChangedAsync(c.idCountDevicesActiveGuests, aAllActiveGuestsDevices.length);

		that.setStateChangedAsync(c.idDeviceList_IPChanged, (that.config.devicesList_IPChanged) ? that.config.devicesList_IPChanged : false);
		that.setStateChangedAsync(c.idDeviceList_OwnerChanged, (that.config.devicesList_OwnerChanged) ? that.config.devicesList_OwnerChanged : false);
		that.setStateChangedAsync(c.idDeviceList_WarnChanged, (that.config.devicesList_WarnChanged) ? that.config.devicesList_WarnChanged : false);
		that.setStateChangedAsync(c.idDeviceList_WatchChanged, (that.config.devicesList_WatchChanged) ? that.config.devicesList_WatchChanged : false);
		
//!P! ggf. DP for lastRun

        //!P!that.setState('info.connection', { val: true, ack: true });
        that.setState('info.connection', true, true);

	}  catch (e) {
		//!P! showError(fctName + ': ' + e.message);
		that.log.error(fctName + ': ' + e.message);
	}

	that.log.debug(fctName + ' finished');

} // createDeviceStatusLists()


// Augment the adapter.config object with the actual types
// TODO: delete this in the next version
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ioBroker {
		interface AdapterConfig {
			fb_ip: string;
			fb_port: number;
			fb_uid: string;
			fb_password: any;
			fb_query_interval: number;
			warning_destination: string;
//			dateFormat: string;
			devicesList: any
		}
	}
}

class FbTr064 extends utils.Adapter {

	public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
		super({
			...options,
			name: 'fb-tr-064',
		});
		this.on('ready', this.onReady.bind(this));
		//this.on('objectChange', this.onObjectChange.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here
		try {
			// examples for the checkPassword/checkGroup functions
/*			let result = await this.checkPasswordAsync('admin', 'iobroker');
			this.log.info('check user admin pw iobroker: ' + result);

			result = await this.checkGroupAsync('admin', 'admin');
			this.log.info('check group user admin group admin: ' + result);
*/
			// <<<<<<<<<<<<<<<<<<<<<<<<<<< >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

			this.log.info('onReady start ' + adapter.name + ': ip-address: ' + this.config.fb_ip + ' polling interval: ' + this.config.fb_query_interval + ' sec.');

			if (this.config.fb_uid === '' || this.config.fb_password === '' || this.config.fb_ip === '') {
				this.log.error('onReady, Please set the connection params (ip, user, password, etc.) in the adapter options before starting the adapter!');
			} else {
				// The adapters config (in the instance object everything under the attribute "native") is accessible via
				// this.config:
				const oSystemCfg: any = await this.getForeignObjectAsync('system.config');
				this.log.debug('onReady, oSystemCfg: ' + JSON.stringify(oSystemCfg));
				this.log.debug('onReady, adapterCfg: ' + JSON.stringify(this.config));

				if (oSystemCfg && oSystemCfg.native && oSystemCfg.native.secret) {
					//noinspection JSUnresolvedVariable
					this.config.fb_password = decrypt(oSystemCfg.native.secret, this.config.fb_password);
				} else {
					this.config.fb_password = decrypt('SdoeQ85NTrg1B0FtEyzf', this.config.fb_password);
					//adapter.config.client_secret = decrypt("Zgfr56gFe87jJOM", adapter.config.client_secret);
				}

				this.log.debug('onReady, configuration fb_uid: ' + this.config.fb_uid);
				this.log.debug('onReady, configuration fb_password: ' + this.config.fb_password);
				this.log.debug('onReady, configuration warning_destination: ' + this.config.warning_destination);
				this.log.debug('onReady, configuration warning_destination: ' + this.config.warning_destination);

				// eslint-disable-next-line @typescript-eslint/camelcase
				this.config.fb_port = 49000;

				const jDeviceInfo: c.IDeviceInfo = {
					hostname: this.config.fb_ip,
					port: this.config.fb_port,
					sslPort: 0,
					uid: this.config.fb_uid,
					pwd: this.config.fb_password
				};
				this.log.debug('onReady, jDeviceInfo: ' + JSON.stringify(jDeviceInfo));

				//Create global objects
				await mFbObj.createInstanceRootObjects(this, c.HTML + c.HTML_END, c.HTML_GUEST + c.HTML_END);

				// get new Fb instance
				mFbClass = new mFb.Fb(jDeviceInfo, this);
				//this.log.debug('mFbClass: ' + Flatted.stringify(mFbClass));

				// check available services
				let bResult: boolean = await mFbClass.chkServices(this);
				this.log.debug('onReady, FbchkServices, bResult: ' + bResult);

				// check adapter configuration user/password
				if (!mFbClass.fbCommunicationError && this.config.fb_uid != '' && this.config.fb_password != '') {
					const resultGSP: any = await mFbClass.soapAction(mFbClass, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', c.GetSecurityPort, null);
					this.log.debug('onReady, resultGSP: ' + JSON.stringify(resultGSP));

					this.log.debug('onReady, c.supportedFunctions: ' + JSON.stringify(c.supportedFunctions));

					if (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0) {
						mFbClass.sslPort = parseInt(resultGSP['NewSecurityPort']);
						this.log.debug('onReady. sslPort ' + mFbClass.sslPort);
					}

					await this.updateDevicesStatus();

					// in this template all states changes inside the adapters namespace are subscribed
					this.subscribeStates('*');

		
					//!T!this.onMessage({"command":"updateDevicesList","message":{"onlyActive":true,"reread":false},"from":"system.adapter.admin.0","callback":{"message":{"onlyActive":true,"reread":false},"id":320,"ack":false,"time":1583270558930},"_id":81771421});
				}
//			});

			}
        } catch (e) {
            this.setState('info.connection', { val: false, ack: true });

			this.log.error('onReady: ' + e.message);
        }
	} // onReady()


	private async updateDevicesStatus() {
		const fctName: string = 'updateDevicesStatus';
		this.log.debug(fctName + ' started');

		let items; // array

		if (!mFbClass.fbCommunicationError && this.config.fb_uid != '' && this.config.fb_password != '') {
			// get network devices from Fritz!Box
			if (c.supportedFunctions.findIndex(x => x === 'X_AVM_DE_GetHostListPath') >= 0) {
				items = await getDeviceList(this, null, mFbClass);
				//this.log.debug('onReady, items: ' + JSON.stringify(items));
			}
			this.log.debug('updateDevicesStatus, items: ' + JSON.stringify(items));

			if (items) {
				// splitt and write in data points
				createDeviceStatusLists(this, items);
			}
			
			// update periodical
			this.log.debug(fctName + ', this.config.devicesList.length: ' + this.config.devicesList.length + '; GetSecurityPort: ' + (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0));
			if(mScheduleStatus == null && this.config.devicesList.length > 0 && (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0)) {
				mScheduleStatus = setInterval(() => this.updateDevicesStatus(), this.config.fb_query_interval * 1000);
				this.log.debug(fctName + ', scheduler for updateDevicesStatus created, run all ' + this.config.fb_query_interval + ' seconds');
			}
		} else {
			this.log.warn(fctName + ', no userid and password set in adapter configuration!');
		}

		this.log.debug(fctName + ' finished');

	} // updateDevicesStatus()


	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
            this.setState('info.connection', { val: false, ack: true });

			this.log.info('cleaned everything up...');

			clearInterval(mScheduleStatus);
			mScheduleStatus = null;

			callback();
		} catch (e) {
			callback();
		}
	}

	/**
	 * Is called if a subscribed object changes
	 */
	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
	/*	if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		} */
		const fctName: string = 'subscription stateChange';
		let fctNameId: string = '';

		const that = this;

		if (state) {
			//  && !state.ack
			this.log.debug(fctName + ', id: ' + id + '; state: ' + JSON.stringify(state));

			let iddp: string = id.substr(this.namespace.length + 1);


			switch (iddp) {
				case c.idDeviceListActive_JSON:
					fctNameId = 'subscription "' + c.idDeviceListActive_JSON + '" changed';

					// devicesList aus config holen, und für alle WATCH-devices ggf. DPs anlegen und Status aktualisieren.
					//const aAllActiveDevices: JSON[] = JSON.parse(state.val);
					//this.log.debug(fctNameId + ', aAllActiveDevices.length: ' + ((aAllActiveDevices) ? aAllActiveDevices.length : 'undefined'));

					const aCfgDevicesList = this.config.devicesList;
					this.log.debug(fctNameId + ', aCfgDevicesList.length: ' + ((aCfgDevicesList) ? aCfgDevicesList.length : 'undefined'));

// "IPAddress": "' + oDevice.IPAddress + '", "MACAddress": "' + oDevice.MACAddress + '", "HostName": "' + oDevice.HostName + '"'
// "InterfaceType": "' + oDevice.InterfaceType + '", "Port": "' + oDevice['X_AVM-DE_Port'] + '", "Speed": "' + oDevice['X_AVM-DE_Speed'] + '"}';

					if((aCfgDevicesList) && aCfgDevicesList.length > 0) {
						mFbObj.updateDevices(this, aCfgDevicesList, maAllDevices);
					}

					this.log.debug(fctNameId + ' finished');
					break;
/*
				case c.idnMowerConnected:
					fctNameId = 'subscrition mower base connected changed';
					this.log.debug(fctNameId + ',  id: "' + c.idnMowerConnected + '"; state.val: ' + state.val);

					if (state.val === false) {
						const sMsg = fctNameId + ' for mower ' + mobjMower.mower.attributes.system.name + ' to FALSE';
						this.setState(c.idnSendMessage, JSON.stringify([new Date().getTime(), sMsg, fctNameId + ' for mower ' + mobjMower.mower.attributes.system.name, false, 1, 'Tg,EL']), true);
					}

					break; */
			}
		} // if (state && !state.ack)
	}

	/**
     * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
     * Using this method requires "common.message" property to be set to true in io-package.json
     * @param {ioBroker.Message} obj
	 * 
	 * ioBroker.Message {
            command: string;				// The command to be executed
            message: MessagePayload;		// The message payload
            from: string;					// The source of this message
            _id: number;					// ID of this message
            callback: MessageCallbackInfo;	// Callback information. This is set when the source expects a response
		}
		
		sendTo(
			instanceName: string,
			command: string,
			message: MessagePayload,
			callback?: MessageCallback | MessageCallbackInfo,
		): void;
    */

	// [{}, error?: ERROR]
	async onMessage(obj: any): Promise<any> {		// obj: 'fb-tr-064.0', 'updateDevicesList', { onlyActive: true, reread: false }, function ...
		// {"command":"updateDevicesList","message":{"onlyActive":true,"reread":false},"from":"system.adapter.admin.0","callback":{"message":{"onlyActive":true,"reread":false},"id":320,"ack":false,"time":1583270558930},"_id":81771421}
		// return (reply) --> JSON-string mit Attribut .error=true im Fehlerfall
		this.log.debug('onMessage, obj: ' + JSON.stringify(obj));

		try {
			if (!obj) return;

			if (typeof obj === 'object' && obj.message) {

				// eslintX-disable-next-line no-inner-declarations
				function reply(that: any, result: any): any {
					that.sendTo (obj.from, obj.command, JSON.stringify(result), obj.callback);
				}

				switch (obj.command) {
					case 'updateDevicesList': {
						const fctNameId = 'onMessage "updateDevicesList"';

						if (!obj.callback) return false;

						// stop status scheduler
						if (mScheduleStatus) clearInterval(mScheduleStatus);
						mScheduleStatus = null;
			
						// create new list for adapter configuration
						let aNewCfgDevicesList: c.IDeviceList = { devices: [], onlyActive: false, error: undefined};
						
						const that = this;
						const aCfgDevicesList = this.config.devicesList;
						that.log.debug(fctNameId + ', aCfgDevicesList: ' + JSON.stringify(aCfgDevicesList));
						this.log.debug(fctNameId + ', maAllDevices.length: ' + ((maAllDevices) ? maAllDevices.length : 'undefined'));

						maAllDevices.map(function(oDevice: any) {
							that.log.debug(fctNameId + ' oDevice: ' + JSON.stringify(oDevice));
							// device active
							// aCfgDevicesList[0] = {devicename: "Acer-NB", macaddress: "00:1C:26:7D:02:D6", ipaddress: "192.168.200.157", ownername: "", interfacetype: "", …}
							const aCfgDevicesListItem: any = ((aCfgDevicesList) && aCfgDevicesList.length >= 0) ? getJsonArrayItemByMAC(aCfgDevicesList, oDevice.MACAddress) : undefined;
							//!P! --> bei Aktualisierung AdapterCfg InterfaceType nur überschreiben, wenn device.InterfaceType != leer
							that.log.debug(fctNameId + ', aCfgDevicesListItem: ' + JSON.stringify(aCfgDevicesListItem));

							aNewCfgDevicesList.devices.push ({
								devicename: ((aCfgDevicesListItem) ? aCfgDevicesListItem.devicename : oDevice.HostName),
								ipaddress: oDevice.IPAddress,
								macaddress: oDevice.MACAddress,
								ownername: ((aCfgDevicesListItem) ? aCfgDevicesListItem.ownername : ''),
								interfacetype: (oDevice.InterfaceType != '') ? oDevice.InterfaceType : ((aCfgDevicesListItem) ? aCfgDevicesListItem.interfacetype : ''),
								active: (oDevice.active == '1' ? true : false),
								warn: ((aCfgDevicesListItem) ? aCfgDevicesListItem.warn : false),
								watch: ((aCfgDevicesListItem) ? aCfgDevicesListItem.watch : false),
								guest: (oDevice.guest == '1' ? true : false)
							} as c.IDevice);
						});
						this.log.debug(fctNameId + ', allDevices: ' + JSON.stringify(aNewCfgDevicesList));

						reply(this, aNewCfgDevicesList);

						return true;
						break;
					}
					case 'updateDevicesStatus':
						// save executed in configuration form

						this.updateDevicesStatus();

						break;

					default:
						this.log.warn('Unknown command: ' + obj.command);

						break;
				}
				if (obj.callback) this.sendTo(obj.from, obj.command, obj.message, obj.callback);

				//!P! ?? return true;    
			}
		} catch (e) {
			//!P!showError('onMessage: ' + e.message);
			this.log.error('onMessage: ' + e.message);
		}
	}

} // onMessage()


function getJsonArrayItemByMAC(aJson: JSON[], sMAC: string): JSON | undefined {
	//return !!adapter.config.devices.find(function (v) { return v.mac === mac;} );
	const fctName: string = 'getJsonArrayItemByMAC';
	//!P! item['xx'], attribute Name als Parameter übergeben

	return <JSON>aJson.find(function (item: any) { return item.macaddress === sMAC;} );
}


function decrypt(sKey: string, sValue: any) {
    let sResult: string = '';
	
	for (let i: number = 0; i < sValue.length; ++i) {
        sResult += String.fromCharCode(sKey[i % sKey.length].charCodeAt(0) ^ sValue.charCodeAt(i));
	}
	
	return sResult;
	
} // decrypt()


if (module.parent) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<ioBroker.AdapterOptions> | undefined) => new FbTr064(options);
} else {
	// otherwise start the instance directly
	(() => new FbTr064())();
}
