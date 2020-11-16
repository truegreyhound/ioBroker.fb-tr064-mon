/* eslint-disable @typescript-eslint/no-inferrable-types */
'use strict';

const parseString = require('xml2js').parseString;
const fetch = require('node-fetch');		// bei "import fetch = require('node-fetch');" koomt es zu folgendem Fehler:
import request = require('request');
import crypto = require('crypto');
//const axios = require("axios");

import util = require('util');

//const EventEmitter = require('events');
import * as c from './constants';
import mFbObj = require('./instance-objects');


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
	that: any;
	auth: c.IAuth;

	constructor(jDeviceInfo: c.IDeviceInfo, that: any) {
//		super(); // idk what this is for yet
		this.that = that;

		this.sslPort = jDeviceInfo.sslPort;
		this.host = jDeviceInfo.host;
		this.port = jDeviceInfo.port;

		this.auth = {
			uid: jDeviceInfo.uid,
			pwd: jDeviceInfo.pwd,
			sn: null,
			auth: null,
			realm: 'F!Box SOAP-Auth',
			chCount : 0
		};
	}

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
	  
	async chkServiceX(sUrl: string, sService: string): Promise<boolean> {
		const sChkServiceUrl = 'http://' + this.host + ':' + this.port + sUrl;
		this.that.log.debug('getService status, sChkServiceUrl: ' + sChkServiceUrl + '; sService: ' + sService);		// http://192.168.200.101:49000/hostsSCPD.xml  --> TR064_HOSTS

		const response = await this.get<{ id: number }>(sChkServiceUrl,	{ });
		this.that.log.debug('chkServiceX: ' + JSON.stringify(response));

		return true;
	}


	async chkServices(that: any): Promise<void> {
		//return new Promise(function (resolve, reject) {
        //    async  () => {
                try {
					// check version ofbox has change
					const dpoFB_version: ioBroker.State = await that.getStateAsync(c.idFritzBoxVersion);
					const dpvFB_version: string = dpoFB_version.val;
					const sFB_URL: string = 'http://' + this.host + ':' + this.port;
					const sChkServiceUrl: string = sFB_URL + c.TR064_DESC;
					//!P! warum dpvFB_version == Object??
					that.log.debug('chkServices status, sChkServiceUrl: ' + sChkServiceUrl + '; dpvFB_version: ' + JSON.stringify(dpvFB_version));		// http://192.168.200.101:49000/hostsSCPD.xml  --> TR064_HOSTS
					
					await fetch(new fetch.Request(sChkServiceUrl, { method: "get" }))
					.then((response: { text: () => any; }) => response.text())
					.then((data: any) => {
						//console.log(data)
						//const thats = that;
						
						parseString(data, {
							explicitArray: false,
							mergeAttrs: true
						}, async function (err: Error, result: any) {
							if (err) {
								that.log.error('chkServices, parseString1: ' + err);

//								reject('chkServices, parseString1: ' + err);
							} else async () => {
								//that.log.debug('chkServices, result: ' + JSON.stringify(result));
								//that.log.debug('chkServices, typeof result.root.systemVersion: ' + typeof result.root.systemVersion);

								const sFB_version = result.root.systemVersion.Display;
								const sFB_name = result.root.device.friendlyName;
								const sFB_modell = result.root.device.modelDescription;
								that.log.debug('chkServices, version: ' + sFB_version + '; sFB_name: ' + sFB_name + '; sFB_modell: ' + sFB_modell);
								that.setStateChangedAsync(c.dppFB_Info_SupportedFunctions + 'version', sFB_version, true);
								that.setStateChangedAsync(c.dppFB_Info_SupportedFunctions + 'name', sFB_name, true);

								// wenn version unterschiedlich, dann neu einlesen
								if(dpvFB_version != sFB_version) {
									//check if the functions are supported by avm
									let ajServices: string[] = [];
									ajServices.push(JSON.stringify({'serviceName': c.X_AVM_DE_GetHostListPath, 'id': 'X_AVM_DE_GetHostListPath'}));
									ajServices.push(JSON.stringify({'serviceName': c.GetSpecificHostEntry, 'id': 'GetSpecificHostEntry'}));
									ajServices.push(JSON.stringify({'serviceName': c.X_AVM_DE_GetSpecificHostEntryByIP, 'id': 'X_AVM_DE_GetSpecificHostEntryByIP'}));
									that.log.debug('chkServices ajServices: ' + ajServices);

									const ajToCheckedServices: string[] = [];
									ajToCheckedServices.push(JSON.stringify({'urlPath': c.TR064_HOSTS, 'serviceNames': ajServices}));
									that.log.debug('chkServices ajToCheckedServices: ' + ajToCheckedServices);

									ajServices = [];
									ajServices.push(JSON.stringify({'serviceName': c.GetSecurityPort, 'id': 'GetSecurityPort'}));
									that.log.debug('chkServices ajServices: ' + ajServices);

									ajToCheckedServices.push(JSON.stringify({'urlPath': c.TR064_DEVINFO, 'serviceNames': ajServices}));
									that.log.debug('chkServices ajToCheckedServices: ' + ajToCheckedServices);

									// for sService in ....
									ajToCheckedServices.forEach(async (sCheckService: string) => {
										that.log.debug('chkServices ajToCheckedServices.foreach, sCheckService: ' + sCheckService);

										const jCheckService = JSON.parse(sCheckService);
										const sChkServiceUrl: string = sFB_URL + jCheckService.urlPath;
										that.log.debug('chkServices ajToCheckedServices.foreach, sChkServiceUrl: ' + sChkServiceUrl);

										await fetch(new fetch.Request(sChkServiceUrl, { method: "get" }))
										.then((response: { text: () => any; }) => response.text())
										.then((data: any) => {
											//console.log(data)

											parseString(data, {
												explicitArray: false,
												mergeAttrs: true
											}, function (err: Error, result: any) {
												if (err) {
													that.log.error('chkServices, parseString2: ' + err);

//													reject('chkServices, parseStrin2: ' + err);

												} else async () => {
													that.log.debug('chkServices, result: ' + JSON.stringify(result));
													that.log.debug('chkServices, jCheckService.serviceNames: ' + JSON.stringify(jCheckService.serviceNames));

													const jServiceNames: Array<string> = jCheckService.serviceNames;
													that.log.debug('chkServices, jCheckService jServiceNames: ' +  JSON.stringify(jServiceNames));

													jServiceNames.forEach((sServiceCfg: string) => {
														that.log.debug('chkServices serviceNames.foreach, sServiceCfg: ' + sServiceCfg);
										
														const jServiceCfg = JSON.parse(sServiceCfg);
														const found = JSON.stringify(result).search(jServiceCfg.serviceName);

														if (found == -1) {
															that.log.warn('chkServices, sService "' + jServiceCfg.serviceName + '" is not supported');
															mFbObj.setStateAsyncEx(that, c.dppFB_Info_SupportedFunctions + jServiceCfg.id, false, {
																name: jServiceCfg.serviceName,
																type: 'boolean',
																role: 'info',
																def: false,
																read: true,
																write: false,
																desc: jServiceCfg.serviceName,
															});

															return;
														} else {
															that.log.debug('chkServices, sService "' + jServiceCfg.serviceName + '" is supported');
															mFbObj.setStateAsyncEx(that, c.dppFB_Info_SupportedFunctions + jServiceCfg.id, true, {
																name: jServiceCfg.serviceName,
																type: 'boolean',
																role: 'info',
																def: false,
																read: true,
																write: false,
																desc: jServiceCfg.serviceName,
															});
															
															c.supportedFunctions.push(jServiceCfg.id);

															return;
														}
													});
												}
											});
										});
									});

									// update version information  
									that.setStateAsync(c.idFritzBoxVersion, sFB_version);

//									resolve(undefined);
								} else {
									// read from adapter states

									// !P! selector über supported functions
									await that.getStatesAsync(c.dppFB_Info_SupportedFunctions + '*', function (err: string | null, idSupportedFunctions: Record<string, ioBroker.State>) {

										if (!idSupportedFunctions) {
											that.log.error('chkServices, error on getStates for "' + c.dppFB_Info_SupportedFunctions + '*"');

//											reject('chkServices, error on getStates for "' + c.dppFB_Info_SupportedFunctions + '*"');
										} else {
											// gather states that need to be read
											that.log.debug('chkServices, idSupportedFunctions: ' + JSON.stringify(idSupportedFunctions));
									
											for (let idState in idSupportedFunctions) {
												if (!idSupportedFunctions.hasOwnProperty(idState) || idSupportedFunctions[idState] === null) {
													//if (!idStates.hasOwnProperty(idState)) {
													continue;
												}
												that.log.debug('chkServices, idState: ' + JSON.stringify(idState));
												
												that.getStateAsync(c.dppFB_Info_SupportedFunctions + 'X_AVM_DE_GetHostListPath', function (err: Error, state: ioBroker.State) {
													if (err) {
														that.log.error('chkServices, error on getStateAsync for "' + state + '": ' + err);

//														reject('chkServices, error on getStateAsync for "' + state + '": ' + err);
													} else {
														if(state.val) c.supportedFunctions.push('X_AVM_DE_GetHostListPath');
													}
												});
											};
										}				
//										resolve(undefined);
									});
								}
							}
						});

						//that.emit('chkServices_Finished');

						that.log.debug('chkServices finished');
					});
                } catch (error) {    
					that.log.error('chkServices, error: ' + error);

//					reject(error);
					
                }
//            };
//		});
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
			request(sUrl, (error: Error, response: any, body: any) => {
				if (error) reject(error);
				if (!error && response.statusCode != 200) {
					reject('Invalid status code <' + response.statusCode + '>');
				}
				parseString(body, {explicitArray: false}, function (err: Error, result: any) {
					resolve(result);
				});
			});
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
			this.that.log.debug('soapAction started, fb.host ' + oDevice.host + '; sUrl: ' + sUrl + '; sServiceType: ' + sServiceType + '; sAction: ' + sAction + '; vars: ' + JSON.stringify(vars));

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
                
				this.that.log.debug('soapAction, request url ' + sUri + ' body: ' + sBody);
				//this.that.log.debug('body ' + body);
				request({
					method: 'POST',
					uri: sUri,
					agentOptions: agentOptions,
					headers: {
						'SoapAction': sServiceType + '#' + sAction,
						'Content-Type': 'text/xml',
						'charset': 'utf-8'
					},
					body: sBody
				}, function (error: Error, response: any, body: any) {
					that.log.debug('soapAction, body response: ' + JSON.stringify(response) + ' ' + body );
                    
					if (!error && response.statusCode == 200) {
						parseString(body, {explicitArray: false}, async function (err: Error, result: any) {
							//this.that.log.debug('soapAction, soap1 ' + device._auth.chCount + ' ' + JSON.stringify(result));
							//let challange = false;
							let res = {};
							const env = result['s:Envelope'];
                            
							if (env['s:Header']) {
								const sHeader = env['s:Header'];
                                
								if (sHeader['h:Challenge']) {
									const ch = sHeader['h:Challenge'];
                                    
									//challange = true;
									if (oDevice.auth.chCount > 2) {
										reject('credentials incorrect');
									} else {
										oDevice.auth.sn = ch.Nonce;
										oDevice.auth.realm = ch.Realm;
										oDevice.auth.auth = oDevice._calcAuthDigest(oDevice.auth.uid,
											oDevice.auth.pwd,
											oDevice.auth.realm,
											oDevice.auth.sn as string);
										oDevice.auth.chCount++;
                                        
										// Repeat request.
										const resp = await that.soapAction(oDevice, sUrl, sServiceType, sAction, vars);
										//this.that.log.debug('soapAction, soap2 ' + device._auth.chCount + ' ' + JSON.stringify(resp));
										resolve(resp);
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
									reject('Device responded with fault ' + fault);
									res = fault;
								}
							}
							//this.that.log.debug('soapAction, soap3d ' + device._auth.chCount + ' ' + JSON.stringify(res));
							resolve(res);
						});
					}
					if (!error && response.statusCode != 200) {
						//this.that.log.error('soapAction error ' + body['s:Fault']);
						reject(body['s:Fault']);
					}
					if (error) {
						//this.that.log.error('soapAction error: ' + error);
						reject('soapAction ' + error);
					}
				});
			});
		} catch (e) {
			this.that.log.error('soapAction, error: ' + e.message);
		}    
	}
}



