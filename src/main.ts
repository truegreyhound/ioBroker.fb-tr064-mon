/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/camelcase */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.21.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here, e.g.:
// import * as fs from 'fs';
// load your modules here, e.g.:
//const schedule = require('node-schedule');
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



async function getDeviceList(that: any, cfg: any, Fb: mFb.Fb): Promise<any> {
	try {
		//get device list
		const sHostPath: any = await Fb.soapAction(Fb, '/upnp/control/hosts', c.URN + 'Hosts:1', c.X_AVM_DE_GetHostListPath, null);
		that.log.debug('getDeviceList, sHostPath: ' + JSON.stringify(sHostPath) + '; typeof: ' + typeof sHostPath);

		const sUrl: string = 'http://' + Fb.host + ':' + Fb.port + sHostPath['NewX_AVM-DE_HostListPath'];
		that.log.debug('getDeviceList, sUrl : ' + sUrl);

		const deviceList = await Fb.getDeviceList(sUrl);
		that.log.debug('getDeviceList, deviceList: ' + JSON.stringify(deviceList) + '; typeof: ' + typeof deviceList);
		that.log.debug('getDeviceList, deviceList["List"]["Item"]: ' + JSON.stringify(deviceList['List']['Item']));

		//!P! ?? let errorCnt: number = 0;
/*!P!
		that.setState('devices', { val: deviceList['List']['Item'].length, ack: true });
		that.setState('info.connection', { val: true, ack: true }); //Fritzbox connection established
		that.setState('info.lastUpdate', { val: new Date(), ack: true });
*/
		return deviceList['List']['Item'];
	}  catch (e) {
		//!P! showError('getDeviceList: '+e.message);
		that.log.error('getDeviceList: ' + e.message);
	}   
}


// Augment the adapter.config object with the actual types
// TODO: delete this in the next version
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace ioBroker {
		interface AdapterConfig {
			// Define the shape of your options here (recommended)
			option1: boolean;
			option2: string;
			// Or use a catch-all approach
			[key: string]: any;

			fb_ip: string;
			fb_port: number;
			fb_uid: string;
			fb_password: string;
			fb_query_interval: number;
			history_source: string;
			dateFormat: string;
		
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
		//this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		// Initialize your adapter here
		try {

			// The adapters config (in the instance object everything under the attribute 'native') is accessible via
			// this.config:
			this.log.info('config option1: ' + this.config.option1);
			this.log.info('config option2: ' + this.config.option2);

			/*
			For every state in the system there has to be also an object of type state
			Here a simple template for a boolean variable named 'testVariable'
			Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
			*/
			await this.setObjectAsync('testVariable', {
				type: 'state',
				common: {
					name: 'testVariable',
					type: 'boolean',
					role: 'indicator',
					read: true,
					write: true,
				},
				native: {},
			});

			/*
			setState examples
			you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
			*/
			// the variable testVariable is set to true as command (ack=false)
			await this.setStateAsync('testVariable', true);

			// same thing, but the value is flagged 'ack'
			// ack should be always set to true if the value is received from or acknowledged from the target system
			await this.setStateAsync('testVariable', { val: true, ack: true });

			// same thing, but the state is deleted after 30s (getState will return null afterwards)
			await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

			// examples for the checkPassword/checkGroup functions
			let result = await this.checkPasswordAsync('admin', 'iobroker');
			this.log.info('check user admin pw iobroker: ' + result);

			result = await this.checkGroupAsync('admin', 'admin');
			this.log.info('check group user admin group admin: ' + result);

			// <<<<<<<<<<<<<<<<<<<<<<<<<<< >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

			const nCron = this.config.fb_query_interval * 1000;
			this.log.info('onReady start ' + adapter.name + ': ip-address: ' + this.config.fb_ip + ' polling interval: ' + this.config.fb_query_interval + ' sec.');

			if (this.config.fb_uid === '' || this.config.fb_password === 'PASSWORD' || this.config.fb_ip === '') {
				this.log.error('onReady, Please set the connection params (ip, user,password, etc.) in the adapter options before starting the adapter!');
			} else {
				// The adapters config (in the instance object everything under the attribute "native") is accessible via
				// this.config:
				const oSystemCfg: any = await this.getForeignObjectAsync('system.config');
				this.log.debug('onReady, oSystemCfg: ' + JSON.stringify(oSystemCfg));

				if (oSystemCfg && oSystemCfg.native && oSystemCfg.native.secret) {
					this.config.fb_password = decrypt(oSystemCfg.native.secret, this.config.fb_password);
				} else {
					this.config.fb_password = decrypt('SdoeQ85NTrg1B0FtEyzf', this.config.fb_password);
				}

				this.log.debug('onReady, configuration fb_uid: ' + this.config.fb_uid);
				this.log.debug('onReady, configuration fb_password: ' + this.config.fb_password);
				this.log.debug('onReady, configuration history_source: ' + this.config.history_source);
				this.log.debug('onReady, configuration dateformat: ' + this.config.dateformat);

				// eslint-disable-next-line @typescript-eslint/camelcase
				this.config.fb_port = 49000;

				const jDeviceInfo: c.IDeviceInfo = {
					host: this.config.fb_ip,
					port: this.config.fb_port,
					sslPort: 0,
					uid: this.config.fb_uid,
					pwd: this.config.fb_password
				};
				this.log.debug('onReady, jDeviceInfo: ' + JSON.stringify(jDeviceInfo));

				//Create global objects
				mFbObj.createInstanceRootObjects(this, c.HTML + c.HTML_END, c.HTML_GUEST + c.HTML_END);

				// get new Fb instance
				const Fb: mFb.Fb = new mFb.Fb(jDeviceInfo, this);
				//this.log.debug('Fb: ' + Flatted.stringify(Fb));

				// check available services
				await Fb.chkServices(this);
				
//				Fb.on('chkServices_Finished', () => {
					
					this.log.debug('onReady, Fb.on("chkServices_Finished")');
				
				// check adapter configuration user/password

/*
				const resultGSP: any = Fb.soapAction(Fb, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', c.GetSecurityPort, null);
				this.log.debug('onReady, resultGSP: ' + JSON.stringify(resultGSP));
				if (c.dppFB_Info_SupportedFunctions['GetSecurityPort' as any]){
					Fb.sslPort = parseInt(resultGSP['NewSecurityPort']);
					this.log.debug('onReady. sslPort ' + Fb.sslPort);
				}

				let items; // array??
				if (c.dppFB_Info_SupportedFunctions['X_AVM_DE_GetHostListPath' as any]){
					items = getDeviceList(this, null, Fb);
					this.log.debug('onReady, items: ' + JSON.stringify(items));
				}
				this.log.debug('onReady, items2: ' + JSON.stringify(items));
*/
				// in this template all states changes inside the adapters namespace are subscribed
				//!P!this.subscribeStates('*');

				// connect to FB
				//const cron = '*/ * ' + cfg.iv + ' * * *';
//			});

			}
        } catch (e) {
            this.log.error('onReady: ' + e.message);
        }
	} // onReady()

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private onUnload(callback: () => void): void {
		try {
			this.log.info('cleaned everything up...');
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
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
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
	async onMessage(obj: any): Promise<any> {		// obj: 'fb-tr-064.0', 'discovery', { onlyActive: true, reread: false }, function ...
		// return (reply) --> JSON-string mit Attribut .error=true im Fehlerfall
		this.log.debug('onMessage, obj: ' + JSON.stringify(obj));

		try {
			if (!obj) return;

			if (typeof obj === 'object' && obj.message) {

				// eslintX-disable-next-line no-inner-declarations
				function reply(this: any, result: any): any {
					this.sendTo (obj.from, obj.command, JSON.stringify(result), obj.callback);
				}

				switch (obj.command) {
					case 'discovery':{
//						const allDevices: c.IDevice[] = [];
						const allDevices: c.IDeviceList = JSON.parse('"devices": [], "onlyActive": false');
						let onlyActive, reread;
						
						if (typeof obj.message === 'object') {
							onlyActive = obj.message.onlyActive;
							reread = obj.message.reread;
						}

						if (!obj.callback) return false;

						//!P! allDevices muss Modul-Variable sein und hier wird das vorhandene und gefüllte Objekt zurückgegeben
						//!P! allDevices braucht ein Interface!!
						// allDevices.onlyActive
						// allDevices[]
						if (!reread && allDevices.devices.length > 0 && allDevices.onlyActive === onlyActive) {
							reply(allDevices);

							return true;
						}
						allDevices.onlyActive = onlyActive;

						this.config.fb_port = 49000;

						const jDeviceInfo: c.IDeviceInfo = {
							host: this.config.fb_ip,
							port: this.config.fb_port,
							sslPort: 0,
							uid: this.config.fb_uid,
							pwd: this.config.fb_password
						};
						const Fb: mFb.Fb = new mFb.Fb(jDeviceInfo, this);

						let items; // array??
//!P!						if (mIsSupported_GetPath){
							items = await getDeviceList(this, null, Fb);
							this.log.debug('onMessage, items: ' + JSON.stringify(items));
						//}
                        
						for (let i: number = 0; i < items.length; i++) {
							const bActive: boolean = items[i]['Active'];

							if (!onlyActive || bActive) {
								allDevices.devices.push ({
									name: items[i]['HostName'],
									ip: items[i]['IPAddress'],
									mac: items[i]['MACAddress'],
									active: bActive
								} as c.IDevice);
							}
						}
						this.log.debug('onMessage, allDevices: ' + JSON.stringify(allDevices));
						reply(allDevices);

						return true;
					}
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

}


function decrypt(sKey: string, sValue: string) {
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
