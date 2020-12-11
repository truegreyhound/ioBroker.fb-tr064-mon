/* eslint-disable @typescript-eslint/no-inferrable-types */
'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const parseString = require('xml2js').parseString;
const fetch = require('node-fetch'); // bei "import fetch = require('node-fetch');" kommt es zu folgendem Fehler:
const request = require("request");
const crypto = require("crypto");
//const EventEmitter = require('events');
const c = __importStar(require("./constants"));
const mFbObj = require("./instance-objects");
/**
 * fritz box
 * @param {object} jDeviceInfo - connection infos for fritzbox
 * @constructor
 */
//!P!export class Fb extends EventEmitter {
class Fb {
    constructor(jDeviceInfo, that) {
        this.fbCommunicationError = false;
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
            chCount: 0
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
    async http(httpRequest) {
        const httpResponse = await fetch(httpRequest);
        try {
            // may error if there is no body
            httpResponse.parsedBody = await httpResponse.json();
        }
        catch (ex) { }
        if (!httpResponse.ok) {
            throw new Error(httpResponse.statusText);
        }
        console.log('http, response: ' + JSON.stringify(httpResponse));
        return httpResponse;
    }
    async get(path, args = { method: "get" }) {
        return await this.http(new fetch.Request(path, args));
    }
    ;
    async post(path, body, args = { method: "post", body: JSON.stringify(body) }) {
        return await this.http(new fetch.Request(path, args));
    }
    ;
    async put(path, body, args = { method: "put", body: JSON.stringify(body) }) {
        return await this.http(new fetch.Request(path, args));
    }
    ;
    async wait(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    }
    xmlToJSON(str, options) {
        return new Promise((resolve, reject) => {
            parseString(str, options, (err, jsonObj) => {
                if (err) {
                    return reject(err);
                }
                resolve(jsonObj);
            });
        });
    }
    async httpGetAsJson(url) {
        return await fetch(new fetch.Request(url, { method: "get" }))
            .then((response) => response.text())
            .then((data) => {
            //console.log('httpGetAsJson data: ' + JSON.stringify(data));
            return this.xmlToJSON(data, { explicitArray: false, mergeAttrs: true });
        });
    } // httpGetAsJson()
    async checkServiceAsync(sFB_URL, aServices, callback) {
        const fctName = 'checkServicesAsync';
        try {
            for (let index = 0; index < aServices.length; index++) {
                //			await callback(aServices[index], index, aServices);
                const sCheckService = aServices[index];
                this.that.log.debug(fctName + ' ajToCheckedServices.foreach, sCheckService: ' + sCheckService);
                const jCheckService = JSON.parse(sCheckService);
                this.that.log.debug(fctName + ', jCheckService.serviceNames: ' + JSON.stringify(jCheckService.serviceNames));
                const jServiceNames = jCheckService.serviceNames;
                this.that.log.debug(fctName + ', jCheckService jServiceNames2: ' + JSON.stringify(jServiceNames));
                const sChkServiceUrl = sFB_URL + jCheckService.urlPath;
                this.that.log.debug(fctName + ' ajToCheckedServices.foreach, sChkServiceUrl: ' + sChkServiceUrl);
                const result = await this.httpGetAsJson(sChkServiceUrl);
                //			this.that.log.debug(fctName + ' result: ' + JSON.stringify(result));
                this.fbCommunicationError = false;
                await callback(result, jServiceNames);
            }
        }
        catch (_a) {
            (err) => {
                this.that.log.error(fctName + ', generell error: ' + JSON.stringify(err));
                // FetchError: request to http://192.168.200.101:49000/tr64desc.xml failed, reason: read ECONNRESET
                if (err && JSON.stringify(err).indexOf('reason: read ECONNRESET') >= 0) {
                    this.that.log.warn(fctName + ', generell error: \'read ECONNRESET\' is an problem on the Fritz!Box, please reboot the box and try again.');
                }
                this.fbCommunicationError = true;
                callback(undefined, undefined);
            };
        }
    } // checkServicesAsync()
    async chkServices(that) {
        let bFctState = false;
        const fctName = 'chkServices';
        that.log.debug(fctName + ' started');
        try {
            // check version of box has change
            const dpvSFFB_version = await mFbObj.getStateValAsyncEx(that, c.idSupportedFunctions_FritzBoxVersion, '');
            that.log.debug(fctName + ' status, dpvSFFB_version: >' + dpvSFFB_version + '<<<');
            const sFB_URL = 'http://' + this.host + ':' + this.port;
            const sChkServiceUrl = sFB_URL + c.TR064_DESC;
            that.log.debug(fctName + ' status, sChkServiceUrl: ' + sChkServiceUrl);
            // http://192.168.200.101:49000/hostsSCPD.xml  --> TR064_HOSTS
            //!P! alle Einträge unter supportedFunctions löschen oder auf false setzen
            const result = await this.httpGetAsJson(sChkServiceUrl);
            //that.log.debug(fctName + ' result: ' + JSON.stringify(result));
            const sFB_version = result.root.systemVersion.Display;
            const sFB_name = result.root.device.friendlyName;
            const sFB_modell = result.root.device.modelDescription;
            that.log.debug(fctName + ', version: ' + sFB_version + '; sFB_name: ' + sFB_name + '; sFB_modell: ' + sFB_modell);
            that.setStateAsync(c.idFritzBoxVersion, sFB_version);
            that.setStateChangedAsync(c.idFritzBoxName, sFB_name, true);
            that.name = sFB_name;
            // wenn version unterschiedlich, dann neu einlesen
            if (dpvSFFB_version != sFB_version) {
                // check if the functions are supported by avm
                let ajServices = [];
                ajServices.push(JSON.stringify({ 'serviceName': c.X_AVM_DE_GetHostListPath, 'id': 'X_AVM_DE_GetHostListPath' }));
                ajServices.push(JSON.stringify({ 'serviceName': c.GetSpecificHostEntry, 'id': 'GetSpecificHostEntry' }));
                ajServices.push(JSON.stringify({ 'serviceName': c.X_AVM_DE_GetSpecificHostEntryByIP, 'id': 'X_AVM_DE_GetSpecificHostEntryByIP' }));
                that.log.debug(fctName + ' ajServices: ' + ajServices);
                const ajToCheckedServices = [];
                ajToCheckedServices.push(JSON.stringify({ 'urlPath': c.TR064_HOSTS, 'serviceNames': ajServices }));
                that.log.debug(fctName + ' ajToCheckedServices: ' + ajToCheckedServices);
                ajServices = [];
                ajServices.push(JSON.stringify({ 'serviceName': c.GetSecurityPort, 'id': 'GetSecurityPort' }));
                that.log.debug(fctName + ' ajServices2: ' + ajServices);
                ajToCheckedServices.push(JSON.stringify({ 'urlPath': c.TR064_DEVINFO, 'serviceNames': ajServices }));
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
                const processToCheckedServices = async () => {
                    await this.checkServiceAsync(sFB_URL, ajToCheckedServices, async (result, jServiceNames) => {
                        that.log.debug(fctName + ' result: ' + JSON.stringify(result));
                        const processServices = async () => {
                            return Promise.all(jServiceNames.map(async (sServiceCfg) => {
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
                                }
                                else {
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
                            }));
                        };
                        await processServices();
                    });
                    that.log.debug('checkServiceAsync done');
                }; // processToCheckedServices()
                await processToCheckedServices();
                that.log.debug('processToCheckedServices done');
                // update version information  
                that.setStateChangedAsync(c.idSupportedFunctions_FritzBoxVersion, sFB_version, true);
                bFctState = true;
            }
            else {
                // read from adapter states
                that.log.debug(fctName + ', getStatesAsync: ' + c.dppFB_Info_SupportedFunctions + '*');
                // getStatesAsync(pattern: string, options?: unknown): Promise<CallbackReturnTypeOf<GetStatesCallback>>;
                // type GetStatesCallback = (err: string | null, states: Record<string, State>) => void;
                await that.getStatesAsync(c.dppFB_Info_SupportedFunctions + '*')
                    .catch((err) => {
                    that.log.error(fctName + ', error: ' + JSON.stringify(err));
                    return false;
                })
                    .then(async (idSupportedFunctions) => {
                    if (!idSupportedFunctions) {
                        that.log.error(fctName + ', error on getStates for "' + c.dppFB_Info_SupportedFunctions + '*"');
                        return false;
                    }
                    else {
                        // gather states that need to be read
                        that.log.debug(fctName + ', idSupportedFunctions: ' + JSON.stringify(idSupportedFunctions));
                        for (let idState in idSupportedFunctions) {
                            that.log.debug(fctName + ', idState: ' + JSON.stringify(idState));
                            const idnState = idState.substr(idState.lastIndexOf('.') + 1);
                            // check has properties and value
                            if (!idSupportedFunctions.hasOwnProperty(idState) || idSupportedFunctions[idState] === null) {
                                continue;
                            }
                            if (idSupportedFunctions[idState].val)
                                c.supportedFunctions.push(idnState);
                        }
                        bFctState = true;
                    }
                });
            }
        }
        catch (error) {
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
    async getSSLPort() {
        return new Promise((resolve, reject) => {
            async () => {
                try {
                    const result = await this.soapAction(this, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', 'GetSecurityPort', null);
                    this.that.log.debug('getSSLPort, result:  ' + JSON.stringify(result));
                    const sslPort = parseInt(result.NewSecurityPort);
                    if (typeof sslPort === 'number' && isFinite(sslPort)) {
                        this.sslPort = sslPort;
                        resolve(sslPort);
                    }
                    else {
                        reject('getSSLPort, Got bad port from Device. Port:${result.NewSecurityPort}');
                    }
                }
                catch (error) {
                    reject(error);
                }
            };
        });
    }
    getDeviceList(sUrl) {
        return new Promise((resolve, reject) => {
            try {
                request(sUrl, (error, response, body) => {
                    if (error)
                        reject(error);
                    if (!error && response.statusCode != 200) {
                        reject('Invalid status code <' + response.statusCode + '>');
                    }
                    parseString(body, { explicitArray: false }, function (err, result) {
                        if (err)
                            reject(error);
                        if (!err)
                            resolve(result);
                    });
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    // Login
    _calcAuthDigest(sUid, sPwd, sRealm, sSn) {
        let MD5 = crypto.createHash('md5');
        MD5.update(sUid + ':' + sRealm + ':' + sPwd);
        const secret = MD5.digest('hex');
        MD5 = crypto.createHash('md5');
        MD5.update(secret + ':' + sSn);
        return MD5.digest('hex');
    }
    // Soap query
    async soapAction(oDevice, sUrl, sServiceType, sAction, vars) {
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
                    }
                    else { // First Auth
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
                if (vars != null) {
                    vars.forEach(function (item) {
                        //item[0];
                        sBody += '<' + item[1] + '>';
                        sBody += item[2];
                        sBody += '</' + item[1] + '>';
                    });
                }
                sBody = sBody + '</u:' + sAction + '>' +
                    '</s:Body>' +
                    '</s:Envelope>';
                let nPort = 0;
                let sProto = '';
                let agentOptions = null;
                if (this.sslPort && oDevice.auth.auth) {
                    nPort = this.sslPort;
                    sProto = 'https://';
                    agentOptions = {
                        rejectUnauthorized: false
                    }; // Allow selfsignd Certs
                }
                else {
                    sProto = 'http://';
                    nPort = this.port;
                }
                const sUri = sProto + this.host + ':' + nPort + sUrl;
                const that = this.that; //this speichern
                this.that.log.debug('soapAction, request url ' + sUri + '; body: ' + sBody);
                //this.that.log.debug('body ' + body);
                //!I! https://stackoverflow.com/questions/31258136/how-to-handle-timeout-using-request-with-nodejs
                let requestError;
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
                }, (error, response, body) => {
                    that.log.debug('soapAction, response: ' + oDevice.auth.chCount + ' ' + JSON.stringify(response));
                    //!T!that.log.debug('soapAction, body response: ' + body);
                    if (!error && response.statusCode == 200) {
                        parseString(body, { explicitArray: false }, async (err, result) => {
                            this.that.log.debug('soapAction, soap1 ' + oDevice.auth.chCount + ' ' + JSON.stringify(result));
                            //let challenge = false;
                            if (err)
                                reject('soapAction ' + sAction + ' -> ' + error);
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
                                        }
                                        else {
                                            oDevice.auth.sn = ch.Nonce;
                                            oDevice.auth.realm = ch.Realm;
                                            oDevice.auth.auth = oDevice._calcAuthDigest(oDevice.auth.uid, oDevice.auth.pwd, oDevice.auth.realm, oDevice.auth.sn);
                                            oDevice.auth.chCount++;
                                            that.log.debug('soapAction, challenge, oDevice.auth: ' + JSON.stringify(oDevice.auth));
                                            // Repeat request.
                                            let resp = null;
                                            try {
                                                that.log.debug('soapAction call soapAction with, fb.host ' + oDevice.host + '; sUrl: ' + sUrl + '; sServiceType: ' + sServiceType + '; sAction: ' + sAction + '; vars: ' + JSON.stringify(vars));
                                                resp = await oDevice.soapAction(oDevice, sUrl, sServiceType, sAction, vars);
                                                //this.that.log.debug('soapAction, soap2 ' + device._auth.chCount + ' ' + JSON.stringify(resp));
                                                resolve(resp);
                                            }
                                            catch (e) {
                                                that.log.error('soapAction, challenge, error: ' + ((e.message) ? e.message : JSON.stringify(resp)));
                                                reject('soapAction, challenge, error: ' + ((e.message) ? e.message : JSON.stringify(resp)));
                                            }
                                        }
                                    }
                                    else if (sHeader['h:NextChallenge']) {
                                        const nx = sHeader['h:NextChallenge'];
                                        //device._auth.auth = nx.Nonce;
                                        oDevice.auth.sn = nx.Nonce;
                                        oDevice.auth.realm = nx.Realm;
                                        oDevice.auth.auth = oDevice._calcAuthDigest(oDevice.auth.uid, oDevice.auth.pwd, oDevice.auth.realm, oDevice.auth.sn);
                                        oDevice.auth.chCount = 0;
                                        that.log.debug('soapAction, NextChallenge, oDevice.auth: ' + JSON.stringify(oDevice.auth));
                                    }
                                }
                                if (env['s:Body']) {
                                    const body = env['s:Body'];
                                    //this.that.log.debug('soapAction, soap3a ' + device._auth.chCount + ' ' + JSON.stringify(body));
                                    if (body['u:' + sAction + 'Response']) {
                                        const responseVars = body['u:' + sAction + 'Response'];
                                        res = responseVars;
                                        //this.that.log.debug('soapAction, soap3b ' + device._auth.chCount + ' ' + JSON.stringify(res));
                                    }
                                    else if (body['s:Fault']) {
                                        const fault = body['s:Fault'];
                                        //this.that.log.debug('soapAction, soap3c ' + device._auth.chCount + ' ' + JSON.stringify(fault));
                                        reject('soapAction, device responded with fault ' + fault);
                                        res = fault;
                                        if (oDevice.auth.chCount > 1) {
                                            that.log.error('soapAction, fault ' + oDevice.auth.chCount + ' ' + JSON.stringify(fault));
                                            reject('soapAction, device responded with fault: ' + JSON.stringify(fault));
                                        }
                                    }
                                }
                                //this.that.log.debug('soapAction, soap3d ' + device._auth.chCount + ' ' + JSON.stringify(res));
                                resolve(res);
                            }
                            catch (err) {
                                that.log.error('soapAction: ' + sAction + ' -> ' + err);
                            }
                        });
                    }
                    if (!error && response.statusCode != 200) {
                        //this.that.log.error('soapAction error ' + body['s:Fault']);
                        reject('soapAction ' + sAction + ' -> ' + JSON.stringify(response));
                    }
                    if (error) {
                        requestError = error;
                        //this.that.log.error('soapAction error: ' + error);
                        reject('soapAction ' + sAction + ' -> ' + error);
                    }
                }).on('abort', function () {
                    setTimeout(() => {
                        if (requestError != 'ETIMEDOUT')
                            reject('soapAction timeout, error: ' + requestError);
                        else
                            reject('soapAction timeout, error: REQUEST_ABORTED');
                    }, 1000);
                });
            });
        }
        catch (e) {
            this.that.log.error('soapAction, error: ' + e.message);
        }
    }
} // soapAction()
exports.Fb = Fb;
