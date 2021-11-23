/* eslint-disable @typescript-eslint/no-inferrable-types */
'use strict';

const parseString = require('xml2js').parseString;
const fetch = require('node-fetch');		// bei "import fetch = require('node-fetch');" kommt es zu folgendem Fehler:
import request = require('request');
import crypto = require('crypto');
//const axios = require("axios");

//!P!import util = require('util');

//const EventEmitter = require('events');
import * as c from './constants';
import mFbObj = require('./instance-objects');
//import { stringify } from 'querystring';


interface HttpResponse<T> extends Response {
	parsedBody?: T;
}


/**
 * fritz box
 * @param {object} jDeviceInfo - connection infos for fritzbox
 * @constructor
 */

//!P!export class Fb extends EventEmitter {
export class Fb {
	sslPort: number;			//!P!c.IDeviceInfo.sslPort;
	host: string;				//!P!c.IDeviceInfo.host;
	port: number;				//!P!c.IDeviceInfo.port;
	name: string;				
	that: any;
	auth: c.IAuth;
	fbCommunicationError: boolean = false;


	constructor(jDeviceInfo: c.IDeviceInfo, that: any) {
//		super(); // idk what this is for yet
		this.that = that;

		this.sslPort = jDeviceInfo.sslPort;
		this.host = jDeviceInfo.hostname;
		this.port = jDeviceInfo.port;
		this.name = '';

		this.auth = {
			uid: jDeviceInfo.uid,
			pwd: jDeviceInfo.pwd,
			sn: null,
			auth: null,
			realm: 'F!Box SOAP-Auth',
			chCount : 0
		};
	} // constructor()


	/*
	async http<T>(httpRequest: RequestInfo): Promise<HttpResponse<T>> {
		const response: HttpResponse<T> = await fetch(httpRequest);
	
		try {
			// may error if there is no body
			response.parsedBody = await response.json();
		} catch (ex) {}
	
		if (!response.ok) {
			throw new Error(response.statusText);
		}
		console.log('http, response: ' + JSON.stringify(response));
		return response;
	}
*/	

	// for JSON response
	async http<T>(httpRequest: RequestInfo): Promise<HttpResponse<T>> {
		const httpResponse: HttpResponse<T> = await fetch(httpRequest);

		try {
			// may error if there is no body
			httpResponse.parsedBody = await httpResponse.json();
		} catch (ex) {}
	
		if (!httpResponse.ok) {
			throw new Error(httpResponse.statusText);
		}

		console.log('http, response: ' + JSON.stringify(httpResponse));
		return httpResponse;
	}
			
	
	async get<T>(path: string, args: RequestInit = { method: "get" }): Promise<HttpResponse<T>> {
		return await this.http<T>(new fetch.Request(path, args));
	};

	async post<T>(path: string, body: any, args: RequestInit = { method: "post", body: JSON.stringify(body) }): Promise<HttpResponse<T>>  {
		return await this.http<T>(new fetch.Request(path, args));
	};
	  
	async put<T>(path: string, 	body: any, args: RequestInit = { method: "put", body: JSON.stringify(body) }): Promise<HttpResponse<T>> {
		return await this.http<T>(new fetch.Request(path, args));
	};
	
	async wait(ms: number) {
		return new Promise(r => setTimeout(r, ms));
	}

	async asyncForEach(array: any, callback: any) {
		for (let index = 0; index < array.length; index++) {
		  await callback(array[index], index, array);
		}
	}


	xmlToJSON(str: string, options: any) {
		return new Promise((resolve, reject) => {
		  parseString(str, options, (err: Error, jsonObj: any) => {
			if (err) {
			  return reject(err);
			}
			resolve(jsonObj);
		  });
		});
	}


	async httpGetAsJson<T>(url: string): Promise<T> {
		return await fetch(new fetch.Request(url, { method: "get" }))
			.then((response: { text: () => any; }) => response.text())
			.then((data: any) => {
				//console.log('httpGetAsJson data: ' + JSON.stringify(data));

				return this.xmlToJSON(data, {explicitArray: false, mergeAttrs: true}) as Promise<{ data: T }>;
			});
	} // httpGetAsJson()


	async checkServiceAsync(sFB_URL: string, aServices: any, callback: any) {
		const fctName = 'checkServicesAsync';

		try {
			for (let index = 0; index < aServices.length; index++) {
	//			await callback(aServices[index], index, aServices);
				const sCheckService = aServices[index];

				this.that.log.debug(fctName + ' ajToCheckedServices.foreach, sCheckService: ' + sCheckService);
				const jCheckService = JSON.parse(sCheckService);
				this.that.log.debug(fctName + ', jCheckService.serviceNames: ' + JSON.stringify(jCheckService.serviceNames));

				const jServiceNames: Array<string> = jCheckService.serviceNames;
				this.that.log.debug(fctName + ', jCheckService jServiceNames2: ' +  JSON.stringify(jServiceNames));
				
				const sChkServiceUrl: string = sFB_URL + jCheckService.urlPath;
				this.that.log.debug(fctName + ' ajToCheckedServices.foreach, sChkServiceUrl: ' + sChkServiceUrl);

				const result: any = await this.httpGetAsJson(sChkServiceUrl);
	//			this.that.log.debug(fctName + ' result: ' + JSON.stringify(result));

				this.fbCommunicationError = false;

				await callback(result, jServiceNames); 
			}
		} catch {(err: Error) => {
			this.that.log.error(fctName + ', generell error: ' + JSON.stringify(err));

			// FetchError: request to http://192.168.200.101:49000/tr64desc.xml failed, reason: read ECONNRESET
			if (err && JSON.stringify(err).indexOf('reason: read ECONNRESET') >= 0) {
				this.that.log.warn(fctName + ', generell error: \'read ECONNRESET\' is an problem on the Fritz!Box, please reboot the box and try again.');
			}

			this.fbCommunicationError = true;
			
			callback(undefined, undefined); 
		}}
	} // checkServicesAsync()


	async chkServices(that: any): Promise<boolean> {
		let bFctState: boolean = true;
		const fctName: string = 'chkServices';
		that.log.debug(fctName + ' started');

		try {
			// check version of box has change
			const dpvSFFB_version: ioBroker.State = await mFbObj.getStateValAsyncEx(that, c.idSupportedFunctions_FritzBoxVersion, '');
			that.log.debug(fctName + ' status, dpvSFFB_version: >' + dpvSFFB_version + '<<<');
			const sFB_URL: string = 'http://' + this.host + ':' + this.port;
			const sChkServiceUrl: string = sFB_URL + c.TR064_DESC;
			that.log.debug(fctName + ' status, sChkServiceUrl: ' + sChkServiceUrl);
			// http://192.168.200.101:49000/hostsSCPD.xml  --> TR064_HOSTS

			//!P! alle Einträge unter supportedFunctions löschen oder auf false setzen

			const result: any = await this.httpGetAsJson(sChkServiceUrl);
			//that.log.debug(fctName + ' result: ' + JSON.stringify(result));

			const sFB_version = result.root.systemVersion.Display;
			const sFB_name = result.root.device.friendlyName;
			const sFB_modell = result.root.device.modelDescription;
			that.log.debug(fctName + ', version: ' + sFB_version + '; sFB_name: ' + sFB_name + '; sFB_modell: ' + sFB_modell);

			that.setStateAsync(c.idFritzBoxVersion, sFB_version, true);
			that.setStateChangedAsync(c.idFritzBoxName, sFB_name, true);
			that.name = sFB_name;

			// read from adapter states
			that.log.debug(fctName + ', getStatesAsync: ' + c.dppFB_Info_SupportedFunctions + '*');

			// getStatesAsync(pattern: string, options?: unknown): Promise<CallbackReturnTypeOf<GetStatesCallback>>;
			// type GetStatesCallback = (err: string | null, states: Record<string, State>) => void;
			await that.getStatesAsync(c.dppFB_Info_SupportedFunctions + '*')
			.catch((err: Error) => {
				that.log.error(fctName + ', error: ' + JSON.stringify(err));

				return false;
			})
			.then(async (idSupportedFunctions: Record<string, ioBroker.State>) => {
				if (!idSupportedFunctions) {
					that.log.error(fctName + ', error on getStates for "' + c.dppFB_Info_SupportedFunctions + '*"');

					return false;
				} else {
					// gather states that need to be read
					that.log.debug(fctName + ', idSupportedFunctions: ' + JSON.stringify(idSupportedFunctions));
					// {"fb-tr064-mon.0.info.supportedFunctions.X_AVM_DE_GetHostListPath":{"val":false,"ack":true,"ts":1607976322842,"q":0,"from":"system.adapter.fb-tr064-mon.0","user":"system.user.admin","lc":1607976322842},"fb-tr064-mon.0.info.supportedFunctions.GetSpecificHostEntry":{"val":false,"ack":true,"ts":1607976322857,"q":0,"from":"system.adapter.fb-tr064-mon.0","user":"system.user.admin","lc":1607976322857},"fb-tr064-mon.0.info.supportedFunctions.X_AVM_DE_GetSpecificHostEntryByIP":{"val":false,"ack":true,"ts":1607976322858,"q":0,"from":"system.adapter.fb-tr064-mon.0","user":"system.user.admin","lc":1607976322858},"fb-tr064-mon.0.info.supportedFunctions.GetSecurityPort":{"val":false,"ack":true,"ts":1607976322919,"q":0,"from":"system.adapter.fb-tr064-mon.0","user":"system.user.admin","lc":1607976322919}}
			
					for (let idState in idSupportedFunctions) {
						that.log.debug(fctName + ', idState: ' + JSON.stringify(idState));
						const idnState: string = idState.substr(idState.lastIndexOf('.') + 1);

						// check has properties and value
						if (!idSupportedFunctions.hasOwnProperty(idState) || idSupportedFunctions[idState] === null) {
							continue;
						}

						if(idSupportedFunctions[idState].val && idSupportedFunctions[idState].val === true) {
							c.supportedFunctions.push(idnState);
						} else {
							bFctState = false;
						}
					}
					that.log.debug(fctName + ', check SupportedFunctions finished with: ' + bFctState);
				}
			});

			// wenn version unterschiedlich oder adapter states FALSE, dann neu einlesen
			if(dpvSFFB_version != sFB_version || !bFctState) {
				// check if the functions are supported by avm
				let ajServices: string[] = [];
				ajServices.push(JSON.stringify({'serviceName': c.X_AVM_DE_GetHostListPath, 'id': 'X_AVM_DE_GetHostListPath'}));
				ajServices.push(JSON.stringify({'serviceName': c.GetSpecificHostEntry, 'id': 'GetSpecificHostEntry'}));
				ajServices.push(JSON.stringify({'serviceName': c.X_AVM_DE_GetSpecificHostEntryByIP, 'id': 'X_AVM_DE_GetSpecificHostEntryByIP'}));
				that.log.debug(fctName + ' ajServices: ' + ajServices);

				const ajToCheckedServices: string[] = [];
				ajToCheckedServices.push(JSON.stringify({'urlPath': c.TR064_HOSTS, 'serviceNames': ajServices}));
				that.log.debug(fctName + ' ajToCheckedServices: ' + ajToCheckedServices);

				ajServices = [];
				ajServices.push(JSON.stringify({'serviceName': c.GetSecurityPort, 'id': 'GetSecurityPort'}));
				that.log.debug(fctName + ' ajServices2: ' + ajServices);

				ajToCheckedServices.push(JSON.stringify({'urlPath': c.TR064_DEVINFO, 'serviceNames': ajServices}));
				that.log.debug(fctName + ' ajToCheckedServices2: ' + ajToCheckedServices);

/*				const start = async () => {
					await this.asyncForEach([1, 2, 3], async (num: number) => {
						await this.wait(50);
						that.log.debug(num);
					});
					that.log.debug('Done');
				}
				await start();
*/
				
				// for sService in ....
				//!P! analog zu xmlToJSON in eine Function packen
				const processToCheckedServices = async () =>  {
					await this.checkServiceAsync(sFB_URL, ajToCheckedServices, async (result: any, jServiceNames: any) => {
						that.log.debug(fctName + ' result: ' + JSON.stringify(result));

						const processServices = async () => {
							return Promise.all(jServiceNames.map(async (sServiceCfg: string) => {
								that.log.debug(fctName + ' serviceNames.foreach, sServiceCfg: ' + sServiceCfg);
				
								const jServiceCfg = JSON.parse(sServiceCfg);
								const found = JSON.stringify(result).search(jServiceCfg.serviceName);
			
								if (found == -1) {
									that.log.warn(fctName + ', sService "' + jServiceCfg.serviceName + '" is not supported');

									await mFbObj.setStateAsyncEx(that, c.dppFB_Info_SupportedFunctions + jServiceCfg.id, false, {
										name: jServiceCfg.serviceName,
										type: 'boolean',
										role: 'info',
										def: false,
										read: true,
										write: false,
										desc: jServiceCfg.serviceName,
									});
								} else {
									that.log.debug(fctName + ', sService "' + jServiceCfg.serviceName + '" is supported');
									that.log.debug(fctName + ', c.dppFB_Info_SupportedFunctions "' + c.dppFB_Info_SupportedFunctions + '"; jServiceCfg.id "' + jServiceCfg.id + '"');

									await mFbObj.setStateAsyncEx(that, c.dppFB_Info_SupportedFunctions + jServiceCfg.id, true, {
										name: jServiceCfg.serviceName,
										type: 'boolean',
										role: 'info',
										def: false,
										read: true,
										write: false,
										desc: jServiceCfg.serviceName,
									});
									
									c.supportedFunctions.push(jServiceCfg.id);
								}
		
								return;
							}))
						};

						await processServices();
					});
					that.log.debug('checkServiceAsync done');
				} // processToCheckedServices()
				await processToCheckedServices();

				that.log.debug('processToCheckedServices done');

				// update version information  
				that.setStateChangedAsync(c.idSupportedFunctions_FritzBoxVersion, sFB_version, true);
				bFctState = true;
			}
		} catch (error) {    
			that.log.error(fctName + ', generell error: ' + JSON.stringify(error));

			// FetchError: request to http://192.168.200.101:49000/tr64desc.xml failed, reason: read ECONNRESET
			if (error && JSON.stringify(error).indexOf('reason: read ECONNRESET') >= 0) {
				that.log.warn(fctName + ', generell error: \'read ECONNRESET\' is an problem on the Fritz!Box, please reboot the box and try again.');
			}

			this.fbCommunicationError = true;

			that.log.debug(fctName + ' finished with error: FALSE');

			return false;
		}

		that.log.debug(fctName + ' finished with: ' + bFctState);

		return bFctState;

	} // chkServices()
		

	async getSSLPort(): Promise<any>  {
		return new Promise((resolve, reject) => {
			async  () => {
				try {
					const result = await this.soapAction(this, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', 'GetSecurityPort', null);
					this.that.log.debug('getSSLPort, result:  ' + JSON.stringify(result));

					const sslPort = parseInt(result.NewSecurityPort);
                    
					if (typeof sslPort === 'number' && isFinite(sslPort)) {
						this.sslPort = sslPort;


						resolve(sslPort);
					} else {
						reject('getSSLPort, Got bad port from Device. Port:${result.NewSecurityPort}');
					}
				}
				catch (error ) {    
					reject(error);
				}
			};
		});
	}


	getDeviceList(sUrl: string): any {
		return new Promise((resolve, reject) => {
			try {
				request(sUrl, (error: Error, response: any, body: any) => {
					if (error) reject(error);

					if (!error && response.statusCode != 200) {
						reject('Invalid status code <' + response.statusCode + '>');
					}
					parseString(body, {explicitArray: false},  (err: Error, result: any) => {
						if (err) reject(error);

						this.that.log.silly('fb.getDeviceList result: ' + JSON.stringify(result));

						if (!err) resolve(JSON.parse(JSON.stringify(result).replace(/X_AVM\-/g, 'X_AVM_')));
					});
				});
			}
			catch (error ) {    
				reject(error);
			}
		});
	}


	// Login
	_calcAuthDigest(sUid: string, sPwd: string, sRealm: string, sSn: string): string {
		let MD5 = crypto.createHash('md5');
        
		MD5.update(sUid + ':' + sRealm + ':' + sPwd);
        
		const secret = MD5.digest('hex');

		MD5 = crypto.createHash('md5');
		MD5.update(secret + ':' + sSn);
        
		return MD5.digest('hex');
	}


	// Soap query
	async soapAction(oDevice: Fb, sUrl: string, sServiceType: string, sAction: string, vars: any): Promise<any> {
		try {
			this.that.log.debug('fb.soapAction started, fb.host ' + oDevice.host + '; sUrl: ' + sUrl + '; sServiceType: ' + sServiceType + '; sAction: ' + sAction + '; vars: ' + JSON.stringify(vars));

			return new Promise((resolve, reject) => {
				let sHead = '';

				if (oDevice.auth.uid) { // Content Level Authentication 
					if (oDevice.auth.auth) {
						sHead = '<s:Header>' +
                            '<h:ClientAuth xmlns:h="http://soap-authentication.org/digest/2001/10/"' +
                            's:mustUnderstand="1">' +
                            '<Nonce>' + oDevice.auth.sn + '</Nonce>' +
                            '<Auth>' + oDevice.auth.auth + '</Auth>' +
                            '<UserID>' + oDevice.auth.uid + '</UserID>' +
                            '<Realm>' + oDevice.auth.realm + '</Realm>' +
                            '</h:ClientAuth>' +
                            '</s:Header>';
					} else { // First Auth
						sHead = ' <s:Header>' +
                            '<h:InitChallenge xmlns:h="http://soap-authentication.org/digest/2001/10/"' +
                            's:mustUnderstand="1">' +
                            '<UserID>' + oDevice.auth.uid + '</UserID>' +
                            '</h:InitChallenge>' +
                            '</s:Header>';
					}
				}

				let sBody = '<?xml version="1.0" encoding="utf-8"?>' +
                    '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" >' + sHead + '<s:Body>' + '<u:' + sAction + ' xmlns:u="' + sServiceType + '">';
				//insert parameters 
				if (vars != null){
					vars.forEach(function(item: any) { //, index, array
						//item[0];
						sBody += '<' + item[1] + '>';
						sBody += item[2];
						sBody += '</' + item[1] + '>';
					});
				}

				sBody = sBody + '</u:' + sAction + '>' +
                    '</s:Body>' +
                    '</s:Envelope>';
				let nPort: number = 0;
				let sProto: string = '';
				let agentOptions: any = null;

				if (this.sslPort && oDevice.auth.auth) {
					nPort = this.sslPort;
					sProto = 'https://';
					agentOptions = {
						rejectUnauthorized: false
					}; // Allow selfsignd Certs
				} else {
					sProto = 'http://';
					nPort = this.port;
				}
				const sUri: string = sProto + this.host + ':' + nPort + sUrl;
				const that = this.that; //this speichern
                
				this.that.log.debug('fb.soapAction, request url ' + sUri + '; body: ' + sBody);
				//this.that.log.debug('body ' + body);

				//!I! https://stackoverflow.com/questions/31258136/how-to-handle-timeout-using-request-with-nodejs
				let requestError: any;
				request({
					method: 'POST',
					uri: sUri,
					agentOptions: agentOptions,
					headers: {
						'SoapAction': sServiceType + '#' + sAction,
						'Content-Type': 'text/xml',
						'charset': 'utf-8'
					},
					body: sBody,
					timeout: 4000
				}, (error: Error, response: any, body: any) => {
					that.log.debug('fb.soapAction, response: ' + oDevice.auth.chCount + ' ' + JSON.stringify(response));
					//!T!that.log.debug('soapAction, body response: ' + body);
                    
					if (!error && response.statusCode == 200) {
						parseString(body, {explicitArray: false}, async (err: Error, result: any) => {
							this.that.log.debug('fb.soapAction, soap1 ' + oDevice.auth.chCount + ' ' + JSON.stringify(result));
							//let challenge = false;

							if (err) reject('fb.soapAction ' + sAction + ' -> ' + error);

							let res = {};
							const env = result['s:Envelope'];
							
							//!P! hier müsste vorher body,fault geprüft werden, z. B. wegen 503 - Auth. failed (falscher User/Passwort)
							try {
								if (env['s:Header']) {
									const sHeader = env['s:Header'];
									
									if (sHeader['h:Challenge']) {
										const ch = sHeader['h:Challenge'];
										
										//challenge = true;
										if (oDevice.auth.chCount > 2) {
											reject('authentification failure');
										} else {
											oDevice.auth.sn = ch.Nonce;
											oDevice.auth.realm = ch.Realm;
											oDevice.auth.auth = oDevice._calcAuthDigest(oDevice.auth.uid,
												oDevice.auth.pwd,
												oDevice.auth.realm,
												oDevice.auth.sn as string);

											oDevice.auth.chCount++;
											that.log.debug('fb.soapAction, challenge, oDevice.auth: ' + JSON.stringify(oDevice.auth));
											
											// Repeat request.
											let resp = null;
											try {
												that.log.debug('fb.soapAction call soapAction with, fb.host ' + oDevice.host + '; sUrl: ' + sUrl + '; sServiceType: ' + sServiceType + '; sAction: ' + sAction + '; vars: ' + JSON.stringify(vars));

												resp = await oDevice.soapAction(oDevice, sUrl, sServiceType, sAction, vars);
												//this.that.log.debug('soapAction, soap2 ' + device._auth.chCount + ' ' + JSON.stringify(resp));
												resolve(resp);
											} catch (err) {
												that.log.error('fb.soapAction, challenge, error: ${err}' + JSON.stringify(err) ? err : JSON.stringify(resp));
												
												reject('fb.soapAction, challenge, error: ' + ((err) ? err : JSON.stringify(resp)));
											}    
										}
									} else if (sHeader['h:NextChallenge']) {
										const nx = sHeader['h:NextChallenge'];
										//device._auth.auth = nx.Nonce;
										oDevice.auth.sn = nx.Nonce;
										oDevice.auth.realm = nx.Realm;
										oDevice.auth.auth = oDevice._calcAuthDigest(oDevice.auth.uid,
											oDevice.auth.pwd,
											oDevice.auth.realm,
											oDevice.auth.sn as string);

										oDevice.auth.chCount = 0;
										that.log.debug('fb.soapAction, NextChallenge, oDevice.auth: ' + JSON.stringify(oDevice.auth));
									}
								}
								if (env['s:Body']) {
									const body = env['s:Body'];
									//this.that.log.debug('soapAction, soap3a ' + device._auth.chCount + ' ' + JSON.stringify(body));
									if (body['u:' + sAction + 'Response']) {
										const responseVars = body['u:' + sAction + 'Response'];
										
										res = responseVars;
										//this.that.log.debug('soapAction, soap3b ' + device._auth.chCount + ' ' + JSON.stringify(res));
									} else if (body['s:Fault']) {
										const fault = body['s:Fault'];
										
										//this.that.log.debug('soapAction, soap3c ' + device._auth.chCount + ' ' + JSON.stringify(fault));
										reject('fb.soapAction, device responded with fault ' + fault);
										res = fault;

										if (oDevice.auth.chCount > 1){
											that.log.error('fb.soapAction, fault ' + oDevice.auth.chCount + ' ' + JSON.stringify(fault));

											reject('fb.soapAction, device responded with fault: ' + JSON.stringify(fault));
										} 
									}
								}
								//this.that.log.debug('soapAction, soap3d ' + device._auth.chCount + ' ' + JSON.stringify(res));
								resolve(res);
							} catch (err) {
								that.log.error('fb.soapAction: ' + sAction + ' -> ' + err);
							}
						});
					}
					if (!error && response.statusCode != 200) {
						//this.that.log.error('soapAction error ' + body['s:Fault']);
						reject('fb.soapAction ' + sAction + ' -> ' + JSON.stringify(response));
					}
					if (error) {
						requestError = error;

						//this.that.log.error('soapAction error: ' + error);
						reject('fb.soapAction ' + sAction + ' -> ' + error);
					}
				}).on('abort', function(){
					setTimeout(() => { 
						if (requestError != 'ETIMEDOUT') reject('soapAction timeout, error: ' + requestError);
						else reject('fb.soapAction timeout, error: REQUEST_ABORTED');
					}, 1000)
				});
			});
		} catch (e) {
			this.that.log.error('fb.soapAction, error: ${e}');
		}    
	}
} // soapAction()
