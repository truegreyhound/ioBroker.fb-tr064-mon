/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/camelcase */
'use strict';
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Created with @iobroker/create-adapter v1.30.1
 */
/*!P! [iobroker-community-adapters/ioBroker.tr-064] Changes in FritzOS higher 7.24 in the API (#191)
    take attention to the next FritzOS, please.
    https://avm.de/fritz-labor/frisch-aus-der-entwicklung/bekannte-probleme/

    The API and Login with username and password should be changed and need some changes in the assigned tools ( adapters, scripts.. ).

    >> es scheint "nur" Anmeldung mit User/Password pflicht zu sein
*/
/*!P! es kann passieren, dass mehr als 1 inaktives Gerät dieselbe IP in der Fritz!Box-Liste haben, dann kann z. B. für DeviceName "EG-PM2-LAN-01" und IP 192.168.200.131 als Hostname "iPhonevonFrank" "ermittelt" werden
    besser wäre eine bei inaktiven Geräten eine Prüfung ob mehr als 2 Namen (device || hostname) zurückgegeben werden und eine entsprechende Fehlermeldung (Hinweis) ausgegeben bzw. der "richtige" Name aus einer
    anderen Liste "validiert" wird */
//!P! owner wurde in DP nach Änderung auf CfgSeite nicht aktualisiert!?
/*!P! FB-verhalten mit Gäste-WLAN
DeviceName			Active	Active_lc			Inactive_lc	HostName	HostName_lc	IPAddress	IPAddress_lc MACAddress	 		Interfacetype	Guest	Port	Speed	ts					Count	Action
PC-192-168-179-69	true	2020-12-20 20:19:46	- - -	PC-192-168-179-69	- - -	192.168.179.69	- - -	CC:0D:F2:D6:7C:B3					true	0		0	2020-12-20 22:01:11.13	0		removed
PC-192-168-179-69	true	2020-12-20 20:19:46	- - -	PC-192-168-179-69	- - -	192.168.179.69	- - -	CC:0D:F2:D6:7C:B3					true	0		0	2020-12-20 21:57:45.305	0		active

Karls Handy geht wie erwartet aktiv, beim "Verschwinden" wird es aber nicht abgemeldet sondern auf der FB aus der Netzwerkliste entfernt, d. h., es kann in der Konfiguration nur hinzugefügt werden, solange es angemeldet ist.
> Die Action müsste eigentlich "new active" sein
> für bekannte Gäste-WLAN-Geräte muss eine Konfigurationsseite erstellt werden mit: Devicename, MAC, Owner, WarnOn, WarnOff, Watch
    Diese Liste dann heranziehen, wenn für ein neues Device kein Geräte in cfgDevices gefunden wird.
> In ICachedDevice owner aufnehmen, dann dürfte cfgDevices weitgehenst nicht mehr abgerufen werden müssen.
? Muss Liste gesendet werden oder ist sie per adapter.config.knowWLANdevices abrufbar?
*/
//!P! überlegen, ob jeweils eine 2. "statische" new/removed-Liste mit max-item-count für bessere Visualisierung --> ist eigentlich mit den daily changes abgebildet
//!P!#1 ggf. eine Option für changed devices list, ob jeden Tag neu angefangen werden soll, derzeit wird nur bei Änderung geschrieben
//!P!#3 updateCfgDevices: hier müsste ein Mechanismus rein, der diesen Meldungstype nach n Meldungen für den Tag abschaltet; that.log.warn('device "' + jCfgDevice.devicename + '" without MAC address; IP: "' + oDeviceData.IPAddress + '"');
/*!P!#4 updateCfgDevices
    Wenn neue Option "delete unwatched" aktiv, dann  über Selector DP-Liste erstellen und beim Durchlauf verarbeitete löschen
    nach Durchlauf alle DPs in Liste löschen
*/
// !P!#6 updateCfgDevices, remove old device object, ggf. Option, ob das passieren soll
/* !P!
Wenn ein oder alle supported Functions auf false, dann Fehlermeldung und Adapter beenden, ggf. mit Hinweis, die Fritz!Box neu zu starten

Das mit new und change muss noch mal debuggt werden, kommt auf CfgSeite nicht an, geänderte Liste wird dort aber erkannt

2020-12-04 11:42:51.578  - fb-tr064-mon.0 (6804) soapAction, request url https://192.168.200.101:49443/upnp/control/hosts; body: <?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ><s:Header><h:ClientAuth xmlns:h="http://soap-authentication.org/digest/2001/10/"s:mustUnderstand="1"><Nonce>99653D01ADA9D644</Nonce><Auth>2ca5df78159456923b285791c7159d2a</Auth><UserID>TR064</UserID><Realm>F!Box SOAP-Auth</Realm></h:ClientAuth></s:Header><s:Body><u:X_AVM-DE_GetHostListPath xmlns:u="urn:dslforum-org:service:Hosts:1"></u:X_AVM-DE_GetHostListPath></s:Body></s:Envelope>
>> timeout --> warn in log, Timeoutzähler, nach n Fehler ErrorMsg in Log und Adapter disable oder ?


Sortierung deviceName case intensitive

device K3 D8:50:E6:D3:07:87 192.168.200.109 > wird interface Ethernet nicht entfernt, obwohl nicht im Netz
IP-address for device "influx-01" changed (old: "192.168.200.105"; new: "192.168.200.107"; MAC: "90:1B:0E:BA:80:82" > kann es sein, dass das intern nicht aktualisiert wird?  IPlast

Was wenn angelegtes device watch, warnOn und warnOff deaktiviert werden? Device löschen? --> b)


a)	Option in Konfigurationsseite, ob aktuelle Uhrzeit für lastActive/lastInactive bei Neuanlage eines Gerätes genommen werden soll, 0 ist wahrscheinlich bresser/eindeutig
b)	Option in Konfigurationsseite, ob aus der Überwachung fallende Geräte gelöscht werden sollen
c)	Option, ob bei Änderung von MAC/IP eine Warnung gesendet/geloggt werden soll
*/
/* !I!
    deviceName	- Name aus der Adapterkonfiguration == Name des Datenpunktes des Gerätes
    hostName	- Name des Gerätes aus der Fritz!Box

    "guest" ist der festgelegte Ownername für Geräte der Gäste

    Adapterkonfiguration
        Spalte watch - für dieses Geräte werden DPs angelegt
        Spalte warnOn  - geht das Geräte online, wird eine Warnung an den konfigurierten Sender gesendet (Off, Log, Telegram)
        Spalte warnOff  - geht das Geräte Offline, wird eine Warnung an den konfigurierten Sender gesendet (Off, Log, Telegram)

    Initial sind in der deviceList für die Konfiguration deviceName == hostName von der Fritzbox.

    Wird für ein device "watch" aktiviert, dann wird nach dem Speichern der DP für das device wird mit dem deviceName angelegt.

    Wird der "device name" in der Adapterkonfiguration geändert, wird das Geräte nach dem Speichern unter diesem Namen neu angelegt,
    die Werte vom alten DP übernommen und der alte dann gelöscht.
    Außerdem sind ggf. weitere Konfigurationen manuell zu setzen (enum functions (presence_device), etc.).

*/
// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = __importStar(require("@iobroker/adapter-core"));
// Load your modules here, e.g.:
// import * as fs from 'fs';
// load your modules here, e.g.:
//!P!import util = require('util');
//!P!import dateFormat = require('dateformat');
//!P!import {parse, stringify} from 'flatted';
//own libraries
const c = __importStar(require("./lib/constants"));
const mFb = __importStar(require("./lib/fb"));
//import mFb = require('./lib/fb');
const mFbObj = require("./lib/instance-objects");
//!P!import { adapter } from '@iobroker/adapter-core';
//!P!let adapter: any;
let maFbCachedDevices = []; // updated device data from FB
let maChangedDevices = []; // list with the last xx changed devices
let mScheduleStatus = null;
let mTimerStartUpdate = null;
let mFbClass;
/*
    get the list with devices from the box
*/
async function getDeviceList(that, Fb) {
    const fctName = 'getDeviceList';
    that.log.debug(fctName + ' started');
    try {
        //get device list
        const sHostPath = await Fb.soapAction(Fb, '/upnp/control/hosts', c.URN + 'Hosts:1', c.X_AVM_DE_GetHostListPath, null);
        that.log.debug(fctName + ', sHostPath: ' + JSON.stringify(sHostPath) + '; typeof: ' + typeof sHostPath);
        const sUrl = 'http://' + Fb.host + ':' + Fb.port + sHostPath['NewX_AVM-DE_HostListPath'];
        that.log.debug(fctName + ', sUrl : ' + sUrl);
        const deviceList = await Fb.getDeviceList(sUrl);
        that.log.silly(fctName + ', deviceList: ' + JSON.stringify(deviceList));
        //that.log.debug(fctName + ', deviceList["List"]["Item"]: ' + JSON.stringify(deviceList['List']['Item']));
        //!P! ?? let errorCnt: number = 0;
        that.setStateChangedAsync('info.connection', { val: true, ack: true }); //Fritzbox connection established
        that.log.debug(fctName + ', setState("info.connection", TRUE)');
        that.log.debug(fctName + ' finished');
        return deviceList['List']['Item'];
    }
    catch (err) {
        that.log.error(fctName + ': ' + err);
        return null;
    }
    that.log.debug(fctName + ' finished undefined');
} // getDeviceList()
/*
    createDeviceStatusLists(that: any, aDevices: any, bInitial?: boolean)
    that		- adapter context
    aDevices	- array with devices from the Fritz!Box

    liest die von der Fritz!Box geholte Netzwerkliste und setzt den Status der Geräte im Cache (maCachedDevices) und für die Änderungsliste (maChangedDevices) und
    erzeugt die JSON-Listen für die verschiedenen Status
*/
async function createDeviceStatusLists(that, aFbDevices) {
    const fctName = 'createDeviceStatusLists';
    //!P!let bInitial: boolean = false;			// true, if no item in config.devicesList
    let bInitialCache = false; // true, if no item in maCachedDevices
    //!P!that.log.debug(fctName + ' started, bInitial: ' + bInitial);
    that.log.debug(fctName + ' started, aFbDevices: ' + JSON.stringify(aFbDevices));
    try {
        //!PI! sonst ist aAllConfiguredDevices eine Referenz auf that.config.devicesList und splice verändert damit auch den Inhalt von that.config.devicesList
        let aAllConfiguredDevices = JSON.parse(JSON.stringify(that.config.devicesList));
        if (that.config.devicesList) {
            that.log.silly(fctName + ', config.devicesList (' + that.config.devicesList.length + '): ' + JSON.stringify((that.config.devicesList)));
        }
        else {
            that.log.warn(fctName + ', no config.devicesList found, please configure and save the adapter configuration');
        }
        if (that.config.guestdevicesList) {
            that.log.silly(fctName + ', config.guestdevicesList: ' + JSON.stringify((that.config.guestdevicesList)));
        }
        else {
            that.log.warn(fctName + ', no config.guestdevicesList found, please configure and save the adapter configuration');
        }
        that.log.debug(fctName + ', maCachedDevices (' + maFbCachedDevices.length + '): ' + JSON.stringify((maFbCachedDevices)));
        let bActiveChanged = false;
        // reset status
        that.setStateChangedAsync(c.idDeviceList_ActiveChanged, false, true);
        that.setStateChangedAsync(c.idDeviceList_IPChanged, false, true);
        that.setStateChangedAsync(c.idDeviceList_OwnerChanged, false, true);
        that.setStateChangedAsync(c.idDeviceList_WarnChanged, false, true);
        that.setStateChangedAsync(c.idDeviceList_WatchChanged, false, true);
        //!P!bInitial = (!that.config.devicesList || that.config.devicesList.length == 0);		// noch nicht im Adapter aufgerufen/gespeichert
        //!P!that.log.debug(fctName + ', bInitial: ' + bInitial);
        bInitialCache = (!maFbCachedDevices || maFbCachedDevices.length == 0);
        that.log.debug(fctName + ', bInitialCache: ' + bInitialCache);
        that.log.silly(fctName + ', maChangedDevices: ' + JSON.stringify(maChangedDevices));
        that.log.silly(fctName + ', fbIP: ' + JSON.stringify(that.config.fbIP));
        const jCachedDummyDevice = [{
                State: c.CachedDevice_State.non,
                DeviceName: '          ',
                Active: false,
                Active_lc: 0,
                Inactive_lc: 0,
                HostName: '         ',
                HostName_lc: 0,
                IPAddress: '               ',
                IPAddress_lc: 0,
                MACAddress: '            ',
                Interfacetype: '          ',
                Guest: false,
                Port: 0,
                Speed: 0,
                ts: 0,
                Owner: '',
                WarnOn: false,
                WarnOff: false,
                Watch: false,
                new: false,
                changed: false
            }];
        // set 'removed' for all cached devices, after processing all devices, the state should be the current; no known device could be new
        maFbCachedDevices.forEach((jDevice) => { jDevice.State = c.CachedDevice_State.removed; jDevice.new = false; });
        // map - Methode wendet auf jedes Element des Arrays die bereitgestellte Funktion an und gibt das Ergebnis in einem neuen Array zurück.
        // d. h., dass hier manipulierte Element jFbDevice wird hier zum neuen Element in aFbDevices
        aFbDevices.map((jFbDevice) => {
            that.log.debug(fctName + ' > jFbDevice: ' + JSON.stringify(jFbDevice));
            // {"Index":"65","IPAddress":"192.168.200.146","MACAddress":"C8:3C:85:63:DC:83","Active":"1","HostName":"iFranks","InterfaceType":"802.11","X_AVM-DE_Port":"0","X_AVM-DE_Speed":"144","X_AVM-DE_UpdateAvailable":"0","X_AVM-DE_UpdateSuccessful":"unknown","X_AVM-DE_InfoURL":"","X_AVM-DE_Model":"","X_AVM-DE_URL":"","X_AVM-DE_Guest":"0"};
            let bDeviceNew = false;
            if (jFbDevice.IPAddress == that.config.fbIP) {
                // fb
                that.setStateChangedAsync(c.idFritzBoxIP, jFbDevice.IPAddress, true);
                that.setStateChangedAsync(c.idFritzBoxMAC, jFbDevice.MACAddress, true);
            }
            else {
                // get configured parameter for device like macaddress, watch, warnOn, warnOff, ...
                // [{"devicename":"Acer-NB","macaddress":"00:1C:26:7D:02:D6","ipaddress":"192.168.200.157","new":false,"changed":false,"ownername":"","interfacetype":"","warnOn":false,"warnOFF":false,"watch":false},{"devicename": . . .
                let jCfgDevice = null;
                if (that.config.devicesList) {
                    // device list in adapter config exist
                    //!P!const jCfgDevices: [c.IDevice] = that.config.devicesList.filter((item: c.IDevice) => ((item.macaddress && item.macaddress === jFbDevice.MACAddress) || (item.ipaddress && item.ipaddress === jFbDevice.IPAddress)));
                    //!P!jCfgDevice = <c.IDevice>that.config.devicesList.find((item: c.IDevice) => { return ((item.interfacetype && item.interfacetype === jFbDevice.InterfaceType) && ((item.macaddress && item.macaddress === jFbDevice.MACAddress) || (item.ipaddress && item.ipaddress === jFbDevice.IPAddress)));});
                    jCfgDevice = that.config.devicesList.find((item) => { return ((item.macaddress && item.macaddress === jFbDevice.MACAddress) || (item.ipaddress && item.ipaddress === jFbDevice.IPAddress)); });
                    that.log.debug(fctName + ', jCfgDevice: ' + JSON.stringify(jCfgDevice));
                }
                let jCfgGuestDevice = null;
                if (that.config.guestdevicesList) {
                    // device list for guests in adapter config exist
                    jCfgGuestDevice = that.config.guestdevicesList.find((item) => { return ((item.macaddress && item.macaddress === jFbDevice.MACAddress)); });
                    that.log.debug(fctName + ', jCfgGuestDevice: ' + JSON.stringify(jCfgGuestDevice));
                }
                // get cached fb device
                let jFbCachedDevice = maFbCachedDevices.find((item) => { return ((item.HostName && item.HostName === jFbDevice.HostName) && ((item.MACAddress && item.MACAddress === jFbDevice.MACAddress) || (item.IPAddress && item.IPAddress === jFbDevice.IPAddress))); });
                that.log.debug(fctName + ', jCachedDevice: ' + JSON.stringify(jFbCachedDevice));
                // get device from changed device list
                //!P!#1 ggf. eine Option für changed devices list, ob jeden Tag neu angefangen werden soll, derzeit wird nur bei Änderung geschrieben
                //!P!#1that.log.silly(fctName + ', maChangedDevices.find((item: c.IChangedDevice) => { return (((item.MACAddress && item.MACAddress === ' + jFbDevice.MACAddress + ') || (item.IPAddress && item.IPAddress === ' + jFbDevice.IPAddress + ')) && item.ts >= ' + ((new Date()).setHours(0, 0, 0, 0)) + ' && item.Action == ' + (jFbDevice.Active == '1' ? 'active' : 'inactive') + ');})');
                //!P!#1let jChangedDeviceLast: c.IChangedDevice | undefined = <c.IChangedDevice | undefined>maChangedDevices.find((item: c.IChangedDevice) => { return (((item.MACAddress && item.MACAddress === jFbDevice.MACAddress) || (item.IPAddress && item.IPAddress === jFbDevice.IPAddress)) && item.ts >= (new Date()).setHours(0, 0, 0, 0) && item.Action == (jFbDevice.Active == '1' ? 'active' : 'inactive'));});
                /*!P! mit oder ohne InterfaceType? reicht Action? that.log.silly(fctName + ', maChangedDevices.find((item: c.IChangedDevice) => { return (((item.Interfacetype && item.Interfacetype === ' + jFbDevice.InterfaceType + ') && ((item.MACAddress && item.MACAddress === ' + jFbDevice.MACAddress + ') || (item.IPAddress && item.IPAddress === ' + jFbDevice.IPAddress + '))) && item.Action == ' + (jFbDevice.Active == '1' ? 'active' : 'inactive') + ');})');
                let jChangedDeviceLast: c.IChangedDevice | undefined = <c.IChangedDevice | undefined>maChangedDevices.find((item: c.IChangedDevice) => { return (((item.Interfacetype && item.Interfacetype === jFbDevice.InterfaceType) && ((item.MACAddress && item.MACAddress === jFbDevice.MACAddress) ||
                        (item.IPAddress && item.IPAddress === jFbDevice.IPAddress))) && item.Action == (jFbDevice.Active == '1' ? 'active' : 'inactive'));}); */
                that.log.silly(fctName + ', maChangedDevices.find((item: c.IChangedDevice) => { return (((item.MACAddress && item.MACAddress === ' + jFbDevice.MACAddress + ') || (item.IPAddress && item.IPAddress === ' + jFbDevice.IPAddress + ')) && item.Action == ' + (jFbDevice.Active == '1' ? 'active' : 'inactive') + ');})');
                let jChangedDeviceLast = maChangedDevices.find((item) => {
                    return (((item.MACAddress && item.MACAddress === jFbDevice.MACAddress) ||
                        (item.IPAddress && item.IPAddress === jFbDevice.IPAddress)) && item.Action == (jFbDevice.Active == '1' ? 'active' : 'inactive'));
                });
                // JSON.parse(JSON.stringify( - create copy, no reference
                if (jChangedDeviceLast)
                    jChangedDeviceLast = JSON.parse(JSON.stringify(jChangedDeviceLast));
                that.log.debug(fctName + ', jChangedDeviceLast: ' + JSON.stringify(jChangedDeviceLast));
                if (!jFbCachedDevice) {
                    // new device
                    bDeviceNew = true;
                    jFbCachedDevice = {
                        State: (bInitialCache ? c.CachedDevice_State.changed : c.CachedDevice_State.new),
                        DeviceName: '',
                        Active: false,
                        Active_lc: 0,
                        Inactive_lc: 0,
                        HostName: '',
                        HostName_lc: 0,
                        IPAddress: '',
                        IPAddress_lc: 0,
                        MACAddress: '',
                        Interfacetype: '',
                        Guest: false,
                        Port: 0,
                        Speed: 0,
                        ts: (new Date()).getTime(),
                        Owner: '',
                        WarnOn: false,
                        WarnOff: false,
                        Watch: false,
                        new: (bInitialCache ? false : true),
                        changed: false
                    };
                }
                // create item for daily changes log
                let jChangedDevice = {
                    DeviceName: '',
                    Active: false,
                    Active_lc: 0,
                    Inactive_lc: 0,
                    HostName: '',
                    HostName_lc: 0,
                    IPAddress: '',
                    IPAddress_lc: 0,
                    MACAddress: '',
                    Interfacetype: '',
                    Guest: false,
                    Port: 0,
                    Speed: 0,
                    ts: 0,
                    Count: 0,
                    Action: (bDeviceNew && !bInitialCache ? 'new ' : '')
                };
                // check adapter config item exist
                if (jCfgDevice) {
                    // adapter config exist, update cached device data from adapter config od guest config
                    if (jCfgGuestDevice) {
                        jFbCachedDevice.DeviceName = jCfgGuestDevice.devicename;
                        jFbCachedDevice.Owner = jCfgGuestDevice.ownername;
                        jFbCachedDevice.WarnOn = jCfgGuestDevice.warnOn;
                        jFbCachedDevice.WarnOff = jCfgGuestDevice.warnOff;
                        jFbCachedDevice.Watch = jCfgGuestDevice.watch;
                    }
                    else {
                        jFbCachedDevice.DeviceName = jCfgDevice.devicename;
                        jFbCachedDevice.Owner = jCfgDevice.ownername;
                        jFbCachedDevice.WarnOn = jCfgDevice.warnOn;
                        jFbCachedDevice.WarnOff = jCfgDevice.warnOff;
                        jFbCachedDevice.Watch = jCfgDevice.watch;
                        jChangedDevice.DeviceName = jCfgDevice.devicename;
                    }
                }
                else {
                    if (jCfgGuestDevice) {
                        // new device with guest adapter config
                        jFbCachedDevice.DeviceName = jCfgGuestDevice.devicename;
                        jFbCachedDevice.Owner = jCfgGuestDevice.ownername;
                        jFbCachedDevice.WarnOn = jCfgGuestDevice.warnOn;
                        jFbCachedDevice.WarnOff = jCfgGuestDevice.warnOff;
                        jFbCachedDevice.Watch = jCfgGuestDevice.watch;
                        jChangedDevice.DeviceName = jFbDevice.HostName;
                    }
                    else {
                        // new device without adapter config
                        jFbCachedDevice.DeviceName = jFbDevice.HostName;
                        jFbCachedDevice.new = true;
                        jFbCachedDevice.Owner = '';
                        jFbCachedDevice.WarnOn = false;
                        jFbCachedDevice.WarnOff = false;
                        jFbCachedDevice.Watch = false;
                        jChangedDevice.DeviceName = jFbDevice.HostName;
                    }
                }
                if (!bDeviceNew) {
                    // known device in adapter config, remove from known list
                    //!P! würde auch mit filter und != gehen, aber was ist teurer??
                    const nIdxCD = aAllConfiguredDevices.findIndex((item) => ((item.macaddress && item.macaddress === jFbDevice.MACAddress) || (item.ipaddress && item.ipaddress === jFbDevice.IPAddress)));
                    that.log.silly(fctName + ', aAllConfiguredDevices.findIndex: ' + nIdxCD + '; item: ' + JSON.stringify(aAllConfiguredDevices[nIdxCD]));
                    if (nIdxCD >= 0) {
                        aAllConfiguredDevices.splice(nIdxCD, 1);
                        that.log.silly(fctName + ', aAllConfiguredDevices after splice: ' + JSON.stringify(aAllConfiguredDevices));
                    }
                    else {
                        that.log.error(fctName + ', item (item.macaddress === ' + jFbDevice.MACAddress + ' || item.ipaddress === ' + jFbDevice.IPAddress + ') in aAllConfiguredDevices not found! Parameter error?');
                    }
                }
                // update cached device data from Fritz!Box
                // set State to non, if ip address and hostname unchanged
                //!P! ???? c.CachedDevice_State.new && jFbCachedDevice.State != c.CachedDevice_State.removed
                that.log.debug(fctName + ', jFbCachedDevice.State: ' + jFbCachedDevice.State);
                jFbCachedDevice.State = (jFbCachedDevice.State != c.CachedDevice_State.new && jFbCachedDevice.State != c.CachedDevice_State.removed && jFbCachedDevice.IPAddress == jFbDevice.IPAddress && jFbCachedDevice.HostName == jFbDevice.HostName ? c.CachedDevice_State.non : c.CachedDevice_State.changed);
                that.log.debug(fctName + ', jFbCachedDevice.State (after hostname and ip check): ' + jFbCachedDevice.State);
                if (jFbCachedDevice.State == c.CachedDevice_State.changed)
                    jFbCachedDevice.changed = true;
                that.log.debug(fctName + ', jFbCachedDevice.State (after changed check): ' + jFbCachedDevice.State);
                jFbCachedDevice.IPAddress_lc = (jFbCachedDevice.IPAddress != '' && jFbCachedDevice.IPAddress != jFbDevice.IPAddress ? (new Date()).getTime() : jFbCachedDevice.IPAddress_lc);
                jFbCachedDevice.IPAddress = jFbDevice.IPAddress;
                jFbCachedDevice.MACAddress = jFbDevice.MACAddress;
                jFbCachedDevice.HostName_lc = (jFbCachedDevice.HostName != '' && jFbCachedDevice.HostName != jFbDevice.HostName ? (new Date()).getTime() : jFbCachedDevice.HostName_lc);
                jFbCachedDevice.HostName = jFbDevice.HostName;
                // update for changed device list
                jChangedDevice.ts = (jChangedDeviceLast ? jChangedDeviceLast.ts : 0);
                jChangedDevice.IPAddress = jFbDevice.IPAddress;
                jChangedDevice.IPAddress_lc = jFbCachedDevice.IPAddress_lc;
                jChangedDevice.MACAddress = jFbDevice.MACAddress;
                jChangedDevice.HostName = jFbDevice.HostName;
                jChangedDevice.HostName_lc = jFbCachedDevice.HostName_lc;
                jChangedDevice.Count = (jChangedDeviceLast ? jChangedDeviceLast.Count : 0);
                if (jFbDevice.Active == "0") {
                    // inactive
                    if (jCfgDevice && jCfgDevice.warnOff && jFbCachedDevice.Active) {
                        // warn if device went off
                        that.log.warn('device "' + jCfgDevice.devicename + '" went off');
                    }
                    // update cached device data
                    jFbCachedDevice.Inactive_lc = (jFbCachedDevice.Active != false ? (new Date()).getTime() : jFbCachedDevice.Inactive_lc);
                    bActiveChanged = (jFbCachedDevice.Active != false ? true : bActiveChanged);
                    jFbCachedDevice.Active = false;
                    // update device for changelog
                    jChangedDevice.Active = false;
                    jChangedDevice.Active_lc = jFbCachedDevice.Active_lc;
                    jChangedDevice.Inactive_lc = jFbCachedDevice.Inactive_lc;
                    jChangedDevice.Action = jChangedDevice.Action + 'inactive';
                }
                else {
                    // device active
                    if (jCfgDevice && jCfgDevice.warnOn && !jFbCachedDevice.Active) {
                        // warn if device went online
                        that.log.warn('device "' + jCfgDevice.devicename + '" went online');
                    }
                    if (that.config.warningDestination && jFbCachedDevice.new && (jCfgDevice)) {
                        // warn if device new
                        that.log.warn('new device "' + jCfgDevice.devicename + '" detected (ip address: ' + jCfgDevice.ipaddress + ', mac address: ' + jCfgDevice.macaddress + ')');
                    }
                    // update cached device data
                    jFbCachedDevice.Active_lc = (jFbCachedDevice.Active != true ? (new Date()).getTime() : jFbCachedDevice.Active_lc);
                    bActiveChanged = (jFbCachedDevice.Active != true ? true : bActiveChanged);
                    jFbCachedDevice.Active = true;
                    jFbCachedDevice.Interfacetype = jFbDevice.InterfaceType;
                    if (jFbDevice.X_AVM_DE_Port != '')
                        jFbCachedDevice.Port = parseInt(jFbDevice.X_AVM_DE_Port);
                    if (jFbDevice.X_AVM_DE_Speed != '')
                        jFbCachedDevice.Speed = parseInt(jFbDevice.X_AVM_DE_Speed);
                    jFbCachedDevice.Guest = (jFbDevice.X_AVM_DE_Guest != '' ? (jFbDevice.X_AVM_DE_Guest == '1') : false);
                    // update device for changelog
                    jChangedDevice.Active = true;
                    jChangedDevice.Active_lc = jFbCachedDevice.Active_lc;
                    jChangedDevice.Inactive_lc = jFbCachedDevice.Inactive_lc;
                    jChangedDevice.Action = jChangedDevice.Action + 'active';
                    jChangedDevice.Interfacetype = jFbDevice.InterfaceType;
                    jChangedDevice.Port = jFbCachedDevice.Port;
                    jChangedDevice.Speed = jFbCachedDevice.Speed;
                    jChangedDevice.Guest = jFbCachedDevice.Guest;
                }
                // check has device changed
                that.log.debug(fctName + ', jChangedDevice: ' + JSON.stringify(jChangedDevice));
                that.log.silly(fctName + ', jChangedDeviceLast: ' + JSON.stringify(jChangedDeviceLast));
                if (jChangedDeviceLast) {
                    //!P!if (JSON.stringify(jChangedDevice) != JSON.stringify(jChangedDeviceLast)) {
                    if (jChangedDevice.Active != jChangedDeviceLast.Active || jChangedDevice.Active_lc != jChangedDeviceLast.Active_lc || jChangedDevice.Inactive_lc != jChangedDeviceLast.Inactive_lc ||
                        jChangedDevice.DeviceName != jChangedDeviceLast.DeviceName || jChangedDevice.Guest != jChangedDeviceLast.Guest || jChangedDevice.HostName != jChangedDeviceLast.HostName ||
                        jChangedDevice.HostName_lc != jChangedDeviceLast.HostName_lc || jChangedDevice.IPAddress != jChangedDeviceLast.IPAddress || jChangedDevice.IPAddress_lc != jChangedDeviceLast.IPAddress_lc ||
                        jChangedDevice.Interfacetype != jChangedDeviceLast.Interfacetype || jChangedDevice.MACAddress != jChangedDeviceLast.MACAddress || jChangedDevice.Port != jChangedDeviceLast.Port ||
                        jChangedDevice.Action != jChangedDeviceLast.Action || (!that.config.ignoreSpeed && jChangedDevice.Speed != jChangedDeviceLast.Speed)) {
                        bActiveChanged = true;
                        jChangedDevice.Count = (jChangedDevice.ts < ((new Date()).setHours(0, 0, 0, 0)) ? 0 : jChangedDevice.Count + 1); // start each day with count == 0
                        // update speed, other property is different (if that.config.ignoreSpeed == true)
                        jChangedDevice.Speed = ((jFbDevice.X_AVM_DE_Speed != '') ? parseInt(jFbDevice.X_AVM_DE_Speed) : (jFbCachedDevice ? jFbCachedDevice.Speed : 0));
                        jChangedDevice.ts = (new Date()).getTime();
                        //!P! die Frage ist, sollten die Daten in der vorhandenen Zeile aktualisiert werden, ggf. nur bei active oder gelöscht und die neue Werte an den Anfang geschoben werden?
                        // replace item
                        const nL = maChangedDevices.length;
                        that.log.silly(fctName + ', maChangedDevices.findIndex((item: any) => (((item.macaddress && item.macaddress === ' + jFbDevice.MACAddress + ') || (item.ipaddress && item.ipaddress === ' + jFbDevice.IPAddress + ')) && item.ts >= ' + (new Date()).setHours(0, 0, 0, 0) + ' && item.Action == ' + (jFbDevice.Active == '1' ? 'active' : 'inactive') + '))');
                        const nIdx = maChangedDevices.findIndex((item) => (((item.MACAddress && item.MACAddress === jFbDevice.MACAddress) || (item.IPAddress && item.IPAddress === jFbDevice.IPAddress)) && item.ts >= (new Date()).setHours(0, 0, 0, 0) && item.Action == (jFbDevice.Active == '1' ? 'active' : 'inactive')));
                        that.log.silly(fctName + ', maChangedDevices.findIndex: ' + nIdx);
                        if (nIdx >= 0) {
                            maChangedDevices.splice(nIdx, 1);
                            that.log.silly(fctName + ', maChangedDevices after splice, length (' + nL + '/' + maChangedDevices.length + '): ' + JSON.stringify(maChangedDevices));
                        }
                        else {
                            that.log.debug(fctName + ', item in maChangedDevices not found! Parameter error?');
                        }
                        // add new device info
                        maChangedDevices.unshift(jChangedDevice);
                    }
                }
                else { // no jChangedDeviceLast
                    jChangedDevice.Speed = ((jFbDevice.X_AVM_DE_Speed != '') ? parseInt(jFbDevice.X_AVM_DE_Speed) : (jFbCachedDevice ? jFbCachedDevice.Speed : 0));
                    jChangedDevice.ts = (new Date()).getTime();
                    that.log.silly(fctName + ', add jChangedDevice to maChangedDevices ...');
                    maChangedDevices.unshift(jChangedDevice);
                }
                if (bDeviceNew) {
                    maFbCachedDevices.push(jFbCachedDevice);
                    that.log.debug(fctName + ', new jCachedDevice added: ' + JSON.stringify(jFbCachedDevice));
                }
            }
            1;
        });
        that.log.silly(fctName + ', maCachedDevices: ' + JSON.stringify(maFbCachedDevices));
        that.log.silly(fctName + ', maChangedDevices: ' + JSON.stringify(maChangedDevices));
        // check for removed devices in adapter config
        if (aAllConfiguredDevices.length > 0) {
            that.log.warn(fctName + ', following in adapter configured devices removed from Fritz!Box network list: ' + JSON.stringify(aAllConfiguredDevices));
            let bDeviceRemoved = false;
            aAllConfiguredDevices.map((jCfgDevice) => {
                that.log.silly(fctName + ', removed device; jCfgDevice: ' + JSON.stringify(jCfgDevice));
                bDeviceRemoved = true;
                if (jCfgDevice.warnOff)
                    that.log.warn(fctName + ', following device removed from Fritz!Box network list: ' + JSON.stringify(jCfgDevice));
                //!P! ggf, muss hostname der cfgTable im Adapter hinzugefügt werden, wenn das so Probleme macht!?
                let jChangedDevice = {
                    DeviceName: jCfgDevice.devicename,
                    Active: false,
                    Active_lc: 0,
                    Inactive_lc: 0,
                    HostName: jCfgDevice.devicename,
                    HostName_lc: 0,
                    IPAddress: jCfgDevice.ipaddress,
                    IPAddress_lc: 0,
                    MACAddress: jCfgDevice.macaddress,
                    Interfacetype: jCfgDevice.interfacetype,
                    Guest: (jCfgDevice.guest ? jCfgDevice.guest : false),
                    Port: 0,
                    Speed: 0,
                    ts: (new Date()).getTime(),
                    Count: 0,
                    Action: 'removed'
                };
                maChangedDevices.unshift(jChangedDevice);
                // remove from that.config.devicesList
                const nIdxDL = that.config.devicesList.findIndex((item) => ((item.macaddress && item.macaddress === jCfgDevice.macaddress) || (item.ipaddress && item.ipaddress === jCfgDevice.ipaddress)));
                that.log.silly(fctName + ', maChangedDevices.findIndex: ' + nIdxDL);
                if (nIdxDL >= 0) {
                    that.config.devicesList.splice(nIdxDL, 1);
                }
                else {
                    that.log.error(fctName + ', item in config.devicesList not found! Parameter error?');
                }
            });
            if (bDeviceRemoved) {
                that.log.warn('>> Please update the adapter configuration for the devices.');
                that.log.debug(fctName + ', maChangedDevices after remove devices: ' + JSON.stringify(maChangedDevices));
            }
            that.log.debug(fctName + ', check for removed device in adapter config finished');
        }
        await that.setStateChangedAsync(c.idDeviceList_RemovedDevices_JSON, JSON.stringify(aAllConfiguredDevices), true);
        // write data to data points
        that.log.debug(fctName + ', update json lists ...');
        let aFiltered = maFbCachedDevices.filter((device) => (device.Active == true && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceListActive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == false && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == false && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceListInactive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == true && device.Interfacetype == 'Ethernet' && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == true && device.Interfacetype == \'Ethernet\' && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceListActiveLAN_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == true && device.Interfacetype == '802.11' && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == true && device.Interfacetype == \'802.11\' && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceListActiveWLAN_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceListActiveGuests_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.WarnOff == true && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.WarnOff == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceList_Warn_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == true && device.WarnOn == true && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == true && device.WarnOn == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceList_Warn_active_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        aFiltered = maFbCachedDevices.filter((device) => (device.Active == false && device.WarnOff == true && device.State != c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.Active == false && device.WarnOff == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceList_Warn_inactive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        // set counter
        await that.setStateChangedAsync(c.idCountDevicesActive, maFbCachedDevices.filter((device) => (device.Active == true && device.State != c.CachedDevice_State.removed)).length, true);
        await that.setStateChangedAsync(c.idCountDevicesActiveLAN, maFbCachedDevices.filter((device) => (device.Active == true && device.Interfacetype == 'Ethernet' && device.State != c.CachedDevice_State.removed)).length, true);
        await that.setStateChangedAsync(c.idCountDevicesActiveWLAN, maFbCachedDevices.filter((device) => (device.Active == true && device.Interfacetype == '802.11' && device.State != c.CachedDevice_State.removed)).length, true);
        await that.setStateChangedAsync(c.idCountDevicesActiveGuests, maFbCachedDevices.filter((device) => (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed)).length, true);
        await that.setStateChangedAsync(c.idCountDevicesTotal, maFbCachedDevices.length, true);
        // update list new added devices
        aFiltered = maFbCachedDevices.filter((device) => (device.State == c.CachedDevice_State.new));
        that.log.debug(fctName + ', aFiltered (device.State == c.CachedDevice_State.new); count: ' + aFiltered.length + '; items: ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceList_NewAddedDevices_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        // update change device list
        if (aFiltered.length > 0) {
            that.log.warn(fctName + ', follwing new device(s) from Fritz!Box network list detected: ' + JSON.stringify(aFiltered));
            aFiltered.forEach((jRemovedDevice) => {
                let jChangedDevice = {
                    DeviceName: jRemovedDevice.DeviceName,
                    Active: jRemovedDevice.Active,
                    Active_lc: jRemovedDevice.Active_lc,
                    Inactive_lc: jRemovedDevice.Inactive_lc,
                    HostName: jRemovedDevice.HostName,
                    HostName_lc: jRemovedDevice.HostName_lc,
                    IPAddress: jRemovedDevice.IPAddress,
                    IPAddress_lc: jRemovedDevice.IPAddress_lc,
                    MACAddress: jRemovedDevice.MACAddress,
                    Interfacetype: jRemovedDevice.Interfacetype,
                    Guest: jRemovedDevice.Guest,
                    Port: jRemovedDevice.Port,
                    Speed: jRemovedDevice.Speed,
                    ts: (new Date()).getTime(),
                    Count: 0,
                    Action: 'new'
                };
                maChangedDevices.unshift(jChangedDevice);
            });
        }
        aFiltered = maFbCachedDevices.filter((device) => (device.State == c.CachedDevice_State.removed));
        that.log.debug(fctName + ', aFiltered (device.State == c.CachedDevice_State.removed); count: ' + aFiltered.length + '; items: ' + JSON.stringify(aFiltered));
        await that.setStateChangedAsync(c.idDeviceList_RemovedDevices_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), true);
        /*!P!		await mFbObj.setStateAsyncEx(that, c.idDeviceList_RemovedDevices_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)), {
                    name: 'devices.deviceList_RemovedDevices_JSON',
                    type: 'string',
                    role: 'info',
                    def: false,
                    read: true,
                    write: false,
                    desc: 'devices.deviceList_RemovedDevices_JSON',
                }); */
        // update change device list
        if (aFiltered.length > 0) {
            that.log.warn(fctName + ', follwing device(s) removed on Fritz!Box network list: ' + JSON.stringify(aFiltered));
            aFiltered.forEach((jRemovedDevice) => {
                let jChangedDevice = {
                    DeviceName: jRemovedDevice.DeviceName,
                    Active: jRemovedDevice.Active,
                    Active_lc: jRemovedDevice.Active_lc,
                    Inactive_lc: jRemovedDevice.Inactive_lc,
                    HostName: jRemovedDevice.HostName,
                    HostName_lc: jRemovedDevice.HostName_lc,
                    IPAddress: jRemovedDevice.IPAddress,
                    IPAddress_lc: jRemovedDevice.IPAddress_lc,
                    MACAddress: jRemovedDevice.MACAddress,
                    Interfacetype: jRemovedDevice.Interfacetype,
                    Guest: jRemovedDevice.Guest,
                    Port: jRemovedDevice.Port,
                    Speed: jRemovedDevice.Speed,
                    ts: (new Date()).getTime(),
                    Count: 0,
                    Action: 'removed'
                };
                maChangedDevices.unshift(jChangedDevice);
            });
        }
        // check / prepare size daily changes list
        const dpoDeviceList_DailyChanges_maxCount = await that.getStateAsync(c.idDeviceList_DailyChanges_maxCount);
        let nMaxCount = 99;
        if (dpoDeviceList_DailyChanges_maxCount && dpoDeviceList_DailyChanges_maxCount.val) {
            nMaxCount = dpoDeviceList_DailyChanges_maxCount.val;
        }
        that.log.debug(fctName + ', check for maChangedDevices item count: ' + maChangedDevices.length + '; nMaxCount: ' + nMaxCount);
        if (maChangedDevices.length > nMaxCount) {
            maChangedDevices = maChangedDevices.slice(0, nMaxCount);
        }
        that.log.debug(fctName + ', saving maChangedDevices: ' + JSON.stringify(maChangedDevices));
        await that.setStateChangedAsync(c.idDeviceList_DailyChanges_JSON, JSON.stringify(maChangedDevices), true);
        await that.setStateChangedAsync(c.idDeviceList_DailyChanges_count, maChangedDevices.length, true);
        // remove from cached devices list
        maFbCachedDevices = maFbCachedDevices.filter((device) => (device.State != c.CachedDevice_State.removed));
        await that.setStateChangedAsync(c.idDeviceList_CachedDevices_JSON, JSON.stringify(maFbCachedDevices), true);
        that.log.silly(fctName + ', maCachedDevices on finishing: ' + JSON.stringify(maFbCachedDevices));
        await that.setStateChangedAsync(c.idDeviceList_IPChanged, (that.config.devicesListIPChanged) ? that.config.devicesListIPChanged : false, true);
        await that.setStateChangedAsync(c.idDeviceList_OwnerChanged, (that.config.devicesListOwnerChanged) ? that.config.devicesListOwnerChanged : false, true);
        await that.setStateChangedAsync(c.idDeviceList_WarnChanged, (that.config.devicesListWarnChanged) ? that.config.devicesListWarnChanged : false, true);
        await that.setStateChangedAsync(c.idDeviceList_WatchChanged, (that.config.devicesListWatchChanged) ? that.config.devicesListWatchChanged : false, true);
        await that.setStateChangedAsync(c.idDeviceList_ActiveChanged, bActiveChanged, true);
        //!P! ggf. DP for lastRun, allerdings ist das auch an den ts der JSON Listen zu erkennen
        that.setState('info.connection', true, true);
    }
    catch (err) {
        that.log.error(fctName + ': ' + err);
    }
    that.log.debug(fctName + ' finished');
} // createDeviceStatusLists()
class FbTr064 extends utils.Adapter {
    constructor(options = {}) {
        super(Object.assign(Object.assign({}, options), { name: 'fb-tr064-mon' }));
        //!P!adapter = this;
        this.on('ready', this.onReady.bind(this));
        //this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here
        try {
            // examples for the checkPassword/checkGroup functions
            /*			let result = await this.checkPasswordAsync('admin', 'iobroker');
                        this.log.info('check user admin pw iobroker: ' + result);
            
                        result = await this.checkGroupAsync('admin', 'admin');
                        this.log.info('check group user admin group admin: ' + result);
            */
            // <<<<<<<<<<<<<<<<<<<<<<<<<<< >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
            //!P!			this.log.info('onReady start ' + adapter.name + '; ip-address: ' + this.config.fbIP + '; polling interval: ' + this.config.fbQueryInterval + ' sec.');
            this.log.info('onReady start -++*** fb-tr064-mon; ip-address: ' + this.config.fbIP + '; polling interval: ' + this.config.fbQueryInterval + ' sec. ***++-');
            if (this.config.fbUID === '' || this.config.fbPassword === '' || this.config.fbIP === '') {
                this.log.error('onReady, Please set the connection params (ip, user, password, etc.) in the adapter options before starting the adapter!');
                this.setState('info.connection', { val: false, ack: true });
                this.setForeignState("system.adapter." + this.namespace + ".alive", false); // stop adapter
                return;
            }
            else {
                // The adapters config (in the instance object everything under the attribute "native") is accessible via
                // this.config:
                const oSystemCfg = await this.getForeignObjectAsync('system.config');
                this.log.debug('onReady, oSystemCfg: ' + JSON.stringify(oSystemCfg));
                this.log.debug('onReady, adapterCfg: ' + JSON.stringify(this.config));
                if (oSystemCfg && oSystemCfg.native && oSystemCfg.native.secret) {
                    //noinspection JSUnresolvedVariable
                    this.config.fbPassword = decrypt(oSystemCfg.native.secret, this.config.fbPassword);
                }
                else {
                    this.config.fbPassword = decrypt('SdoeQ85NTrg1B0FtEyzf', this.config.fbPassword);
                }
                //this.log.debug('onReady, configuration fbIP: ' + this.config.fbIP);
                this.log.debug('onReady, configuration fbUID: ' + this.config.fbUID);
                //this.log.debug('onReady, configuration fbPassword: ' + this.config.fbPassword);
                this.log.debug('onReady, configuration warningDestination: ' + this.config.warningDestination);
                // eslint-disable-next-line @typescript-eslint/camelcase
                this.config.fbPort = 49000;
                const jDeviceInfo = {
                    hostname: this.config.fbIP,
                    port: this.config.fbPort,
                    sslPort: 0,
                    uid: this.config.fbUID,
                    pwd: this.config.fbPassword
                };
                this.log.debug('onReady, jDeviceInfo: ' + JSON.stringify(jDeviceInfo));
                this.log.debug('onReady, devicesList: ' + JSON.stringify(this.config.devicesList));
                this.log.debug('onReady, devicesListOld: ' + JSON.stringify(this.config.devicesListOld));
                //Create global objects
                await mFbObj.createInstanceRootObjects(this);
                // reset too enable subscription
                //!P! Wenn notwendig, anderen state suchen				this.setStateAsync(c.idDeviceList_DailyChanges, '[]');
                // get new Fb instance
                mFbClass = new mFb.Fb(jDeviceInfo, this);
                //this.log.debug('mFbClass: ' + Flatted.stringify(mFbClass));
                // check available services
                let bResult = await mFbClass.chkServices(this);
                this.log.debug('onReady, mFbClass.chkServices, bResult: ' + bResult);
                if (!bResult)
                    throw ('Fritz!Box doesn`t support required functions!');
                // check adapter configuration user/password
                if (!mFbClass.fbCommunicationError && this.config.fbUID != '' && this.config.fbPassword != '') {
                    const resultGSP = await mFbClass.soapAction(mFbClass, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', c.GetSecurityPort, null);
                    this.log.debug('onReady, resultGSP: ' + JSON.stringify(resultGSP));
                    this.log.debug('onReady, c.supportedFunctions: ' + JSON.stringify(c.supportedFunctions));
                    if (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0) {
                        mFbClass.sslPort = parseInt(resultGSP['NewSecurityPort']);
                        this.log.debug('onReady, sslPort ' + mFbClass.sslPort);
                    }
                    const dpoDeviceList_CachedDevices = await this.getStateAsync(c.idDeviceList_CachedDevices_JSON);
                    if (dpoDeviceList_CachedDevices) {
                        try {
                            maFbCachedDevices = JSON.parse(dpoDeviceList_CachedDevices.val);
                        }
                        catch (err) {
                            this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_CachedDevices_JSON + '): ' + err);
                            maFbCachedDevices = [];
                        }
                    }
                    const dpoDeviceList_DailyChanges = await this.getStateAsync(c.idDeviceList_DailyChanges_JSON);
                    if (dpoDeviceList_DailyChanges) {
                        try {
                            maChangedDevices = JSON.parse(dpoDeviceList_DailyChanges.val);
                        }
                        catch (err) {
                            this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_DailyChanges_JSON + '): ' + err);
                            maChangedDevices = [];
                        }
                    }
                    await this.updateDevicesStatus();
                    // in this template all states changes inside the adapters namespace are subscribed
                    //!P!this.subscribeStates('*');
                    this.subscribeStates(c.idDeviceList_ActiveChanged);
                    this.log.debug('onReady, subscription create for: ' + c.idDeviceList_ActiveChanged);
                    this.subscribeStates(c.idDeviceList_View_Name);
                    this.log.debug('onReady, subscription create for: ' + c.idDeviceList_View_Name);
                    // load set JSON table
                    this.getStateAsync(c.idDeviceList_View_Name, async (err, state) => {
                        try {
                            if (!err && state) {
                                const sTableName = (state.val != 'dailyChanges' ? state.val : 'allDevices');
                                await this.setStateAsync(c.idDeviceList_View_Name, '', true);
                                this.setStateAsync(c.idDeviceList_View_Name, sTableName, true);
                            }
                        }
                        catch (err) {
                            this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_View_Name + '): ' + err);
                        }
                    });
                    //!T!this.onMessage({"command":"updateDevicesList","message":{"onlyActive":true,"reread":false},"from":"system.adapter.admin.0","callback":{"message":{"onlyActive":true,"reread":false},"id":320,"ack":false,"time":1583270558930},"_id":81771421});
                }
                //			});
            }
        }
        catch (err) {
            this.setState('info.connection', { val: false, ack: true });
            this.log.error('onReady: ' + err);
        }
        this.log.debug('onReady finished');
    } // onReady()
    async updateDevicesStatus() {
        const fctName = 'updateDevicesStatus';
        this.log.debug(fctName + ' started');
        let items; // array
        if (!mFbClass) {
            this.log.debug('updateDevicesStatus, \'mFbClass\' not initialice, return');
            return;
        }
        if (mScheduleStatus) {
            clearInterval(mScheduleStatus);
            mScheduleStatus = null;
        }
        if (!mFbClass.fbCommunicationError && this.config.fbUID != '' && this.config.fbPassword != '') {
            // get network devices from Fritz!Box
            if (c.supportedFunctions.findIndex(x => x === 'X_AVM_DE_GetHostListPath') >= 0) {
                items = await getDeviceList(this, mFbClass);
            }
            this.log.debug('updateDevicesStatus, config.devicesList: ' + JSON.stringify(this.config.devicesList));
            this.log.debug('updateDevicesStatus, FB getDeviceList items: ' + JSON.stringify(items));
            if (items) {
                // splitt and write in data points
                createDeviceStatusLists(this, items);
            }
            // update periodical
            this.log.debug(fctName + ', this.config.devicesList.length: ' + this.config.devicesList.length + '; GetSecurityPort: ' + (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0));
            if (!mScheduleStatus && this.config.devicesList.length > 0 && (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0)) {
                mScheduleStatus = setInterval(() => this.updateDevicesStatus(), this.config.fbQueryInterval * 1000);
                this.log.debug(fctName + ', scheduler for updateDevicesStatus created, run all ' + this.config.fbQueryInterval + ' seconds');
            }
        }
        else {
            this.log.warn(fctName + ', no userid and password set in adapter configuration!');
        }
        this.log.debug(fctName + ' finished');
    } // updateDevicesStatus()
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.setState('info.connection', { val: false, ack: true });
            this.log.info('cleaned everything up...');
            if (mScheduleStatus) {
                clearInterval(mScheduleStatus);
                mScheduleStatus = null;
            }
            callback();
        }
        catch (e) {
            callback();
        }
    }
    /**
     * Is called if a subscribed object changes
     */
    /*	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
            if (obj) {
                // The object was changed
                this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
            } else {
                // The object was deleted
                this.log.info(`object ${id} deleted`);
            }
        }
    */
    /**
     * Is called if a subscribed state changes
     *
     * only statea are idDeviceList_DailyChanges, idDeviceList_View_Name
     */
    onStateChange(id, state) {
        /*	if (state) {
                // The state was changed
                this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            } else {
                // The state was deleted
                this.log.info(`state ${id} deleted`);
            } */
        const fctName = 'subscription stateChange';
        let fctNameId = '';
        //!P!const that = this;
        if (state) {
            //  && !state.ack
            this.log.debug(fctName + ', id: ' + id + '; state: ' + JSON.stringify(state));
            let iddp = id.substr(this.namespace.length + 1);
            switch (iddp) {
                case c.idDeviceList_ActiveChanged:
                    if (state.val) { // execute only if val == TRUE
                        fctNameId = 'subscription "' + c.idDeviceList_ActiveChanged + '" changed';
                        // devicesList aus config holen, und für alle WATCH-devices ggf. DPs anlegen und Status aktualisieren.
                        //const aAllActiveDevices: JSON[] = JSON.parse(state.val);
                        //this.log.debug(fctNameId + ', aAllActiveDevices.length: ' + ((aAllActiveDevices) ? aAllActiveDevices.length : 'undefined'));
                        const aCfgDevicesList = this.config.devicesList; // no copy, is a reference
                        this.log.debug(fctNameId + ', aCfgDevicesList.length: ' + ((aCfgDevicesList) ? aCfgDevicesList.length : 'undefined'));
                        // "IPAddress": "' + jFbDevice.IPAddress + '", "MACAddress": "' + jFbDevice.MACAddress + '", "HostName": "' + jFbDevice.HostName + '"'
                        // "InterfaceType": "' + jFbDevice.InterfaceType + '", "Port": "' + jFbDevice['X_AVM-DE_Port'] + '", "Speed": "' + jFbDevice['X_AVM-DE_Speed'] + '"}';
                        if ((aCfgDevicesList) && aCfgDevicesList.length > 0) {
                            updateCfgDevices(this);
                            this.log.debug(fctNameId + ', config.devicesListOld: ' + JSON.stringify(this.config.devicesListOld));
                        }
                        this.log.debug(fctNameId + ' finished');
                    }
                    break;
                case c.idDeviceList_View_Name:
                    fctNameId = 'subscription "' + c.idDeviceList_View_Name + '" changed';
                    this.log.debug(fctNameId + ', to : ' + state.val);
                    if (state.val == '')
                        return;
                    let idJsonState = '';
                    switch (state.val) {
                        case 'allDevices':
                            idJsonState = c.idDeviceList_CachedDevices_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'activeDevices':
                            idJsonState = c.idDeviceListActive_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'inactiveDevices':
                            idJsonState = c.idDeviceListInactive_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'activeLanDevices':
                            idJsonState = c.idDeviceListActiveLAN_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'activeWlanDevices':
                            idJsonState = c.idDeviceListActiveWLAN_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'activeGuestDevices':
                            idJsonState = c.idDeviceListActiveGuests_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'newAddedDevices':
                            idJsonState = c.idDeviceList_NewAddedDevices_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val), true;
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'removedDevices':
                            idJsonState = c.idDeviceList_RemovedDevices_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'configuredWarnDevices':
                            idJsonState = c.idDeviceList_Warn_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'configuredWarnDevicesActive':
                            idJsonState = c.idDeviceList_Warn_active_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                        case 'configuredWarnDevicesInactive':
                            idJsonState = c.idDeviceList_Warn_inactive_JSON;
                            this.getStateAsync(idJsonState, (err, state) => {
                                try {
                                    if (!err && state) {
                                        const jList = JSON.parse(state.val);
                                        this.setStateAsync(c.idDeviceList_View_JSON, state.val, true);
                                        this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length, true);
                                    }
                                }
                                catch (err) {
                                    this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
                                }
                            });
                            break;
                    }
                    break;
            }
        } // if (state)
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
    async onMessage(obj) {
        // {"command":"updateDevicesList","message":{"onlyActive":true,"reread":false},"from":"system.adapter.admin.0","callback":{"message":{"onlyActive":true,"reread":false},"id":320,"ack":false,"time":1583270558930},"_id":81771421}
        // return (reply) --> JSON-string mit Attribut .error=true im Fehlerfall
        this.log.debug('onMessage, obj: ' + JSON.stringify(obj));
        try {
            if (!obj)
                return;
            if (typeof obj === 'object' && obj.message) {
                // eslintX-disable-next-line no-inner-declarations
                function reply(that, result) {
                    that.sendTo(obj.from, obj.command, JSON.stringify(result), obj.callback);
                }
                switch (obj.command) {
                    case 'updateDevicesList': {
                        const fctNameId = 'onMessage "updateDevicesList"';
                        if (!obj.callback)
                            return false;
                        // stop status scheduler
                        if (mScheduleStatus)
                            clearInterval(mScheduleStatus);
                        mScheduleStatus = null;
                        // stop start timer
                        if (mTimerStartUpdate)
                            clearTimeout(mTimerStartUpdate);
                        mTimerStartUpdate = null;
                        // create new list for adapter configuration
                        let aNewCfgDevicesList = { devices: [], onlyActive: false, error: undefined };
                        const that = this;
                        const aCfgDevicesList = JSON.parse(JSON.stringify(this.config.devicesList));
                        that.log.debug(fctNameId + ', aCfgDevicesList: ' + JSON.stringify(aCfgDevicesList));
                        this.log.debug(fctNameId + ', maAllDevices.length: ' + ((maFbCachedDevices) ? maFbCachedDevices.length : 'undefined'));
                        maFbCachedDevices.map((jFbDevice) => {
                            that.log.debug(fctNameId + ' jFbDevice: ' + JSON.stringify(jFbDevice));
                            // device active, get device from adapter configuration
                            // aCfgDevicesList[0] = {devicename: "Acer-NB", macaddress: "00:1C:26:7D:02:D6", ipaddress: "192.168.200.157", ownername: "", interfacetype: "", …}
                            //!P! find setzt vorraus, dass mac oder ip eindeutige Ergebnisse liefern, ansonsten müsste mit filter gearbeitet und bei count > 1 eine Fehler ausgegeben werden
                            const jCfgDevicesListItem = (((aCfgDevicesList) && aCfgDevicesList.length >= 0) ? aCfgDevicesList.find((item) => { return ((item.macaddress && item.macaddress === jFbDevice.MACAddress) || (item.ipaddress && item.ipaddress === jFbDevice.IPAddress)); }) : undefined);
                            //!PI! --> bei Aktualisierung AdapterCfg InterfaceType nur überschreiben, wenn device.InterfaceType != leer
                            that.log.debug(fctNameId + ', aCfgDevicesListItem: ' + JSON.stringify(jCfgDevicesListItem));
                            aNewCfgDevicesList.devices.push({
                                devicename: ((jCfgDevicesListItem) ? jCfgDevicesListItem.devicename : jFbDevice.HostName),
                                ipaddress: jFbDevice.IPAddress,
                                macaddress: jFbDevice.MACAddress,
                                ownername: ((jCfgDevicesListItem) ? jCfgDevicesListItem.ownername : ''),
                                interfacetype: (jFbDevice.Interfacetype != '') ? jFbDevice.Interfacetype : ((jCfgDevicesListItem) ? jCfgDevicesListItem.interfacetype : ''),
                                active: jFbDevice.Active,
                                new: ((jCfgDevicesListItem) ? jCfgDevicesListItem.new : false),
                                changed: ((jCfgDevicesListItem) ? jCfgDevicesListItem.changed : false),
                                warnOn: ((jCfgDevicesListItem) ? jCfgDevicesListItem.warnOn : false),
                                warnOff: ((jCfgDevicesListItem) ? jCfgDevicesListItem.warnOff : false),
                                watch: ((jCfgDevicesListItem) ? jCfgDevicesListItem.watch : false),
                                guest: jFbDevice.Guest
                            });
                        });
                        this.log.debug(fctNameId + ', aNewCfgDevicesList: ' + JSON.stringify(aNewCfgDevicesList));
                        mTimerStartUpdate = setTimeout(() => {
                            this.updateDevicesStatus();
                        }, 60000); // start update after 1 min.
                        reply(this, aNewCfgDevicesList);
                        this.log.debug(fctNameId + ' finished');
                        return true;
                        break;
                    }
                    case 'updateDevicesStatus':
                        const fctNameId = 'onMessage "updateDevicesStatus"';
                        // stop status scheduler
                        if (mScheduleStatus)
                            clearInterval(mScheduleStatus);
                        mScheduleStatus = null;
                        // stop start timer
                        if (mTimerStartUpdate)
                            clearTimeout(mTimerStartUpdate);
                        mTimerStartUpdate = null;
                        // reset new and change flags
                        this.config.devicesList.forEach((jDevice) => { jDevice.new = false; jDevice.changed = false; });
                        maFbCachedDevices.forEach((jDevice) => { jDevice.new = false; jDevice.changed = false; });
                        this.log.silly(fctNameId + ', config.guestdevicesList: ' + JSON.stringify(this.config.guestdevicesList));
                        // process changes in configuration form
                        this.updateDevicesStatus();
                        break;
                    default:
                        this.log.warn('Unknown command: ' + obj.command);
                        break;
                }
                //!???! if (obj.callback) this.sendTo(obj.from, obj.command, obj.message, obj.callback);
                //!P! ?? return true;    
            }
        }
        catch (err) {
            this.log.error('onMessage: ' + err);
        }
    }
} // onMessage()
/*
    aktualisiert die device list für die Konfigurationsansicht

*/
async function updateCfgDevices(that) {
    const fctNameId = 'updateCfgDevices';
    that.log.debug(fctNameId + ' started');
    that.log.debug(fctNameId + ', maCachedDevices: ' + JSON.stringify(maFbCachedDevices));
    const aCfgDevicesList = that.config.devicesList; // no copy, is a reference
    that.log.silly(fctNameId + ', aCfgDevicesList: ' + JSON.stringify(aCfgDevicesList));
    /*!P!#4
    Wenn neue Option "delete unwatched" aktiv, dann über Selector DP-Liste erstellen und beim Durchlauf verarbeitete löschen
    nach Durchlauf alle DPs in Liste löschen
    */
    let bDataChangedIP = false;
    let bDataChangedOwner = false;
    let bDataChangedWarn = false;
    let bDataChangedWatch = false;
    let aCfgDevicesListOld = (that.config.devicesListOld ? JSON.parse(JSON.stringify(that.config.devicesListOld)) : null); // list from last save of confiuration on admin site
    that.log.silly(fctNameId + ', aCfgDevicesListOld: ' + JSON.stringify(aCfgDevicesListOld));
    if (!aCfgDevicesListOld)
        aCfgDevicesListOld = JSON.parse(JSON.stringify(aCfgDevicesList));
    that.log.silly(fctNameId + ', aCfgDevicesListOld2: ' + JSON.stringify(aCfgDevicesListOld));
    if (aCfgDevicesListOld && aCfgDevicesListOld.length > 0) {
        aCfgDevicesList.map(async (jCfgDevice) => {
            that.log.debug(fctNameId + ', jCfgDevice: ' + JSON.stringify(jCfgDevice));
            // {"devicename":"Acer-NB","macaddress":"00:1C:26:7D:02:D6","ipaddress":"192.168.200.157","ownername":"","interfacetype":"","active":false,"watch":true}
            //!P!const jCachedDevice: c.ICachedDevice = <c.ICachedDevice>maFbCachedDevices.find(function (item: c.ICachedDevice) { return ((item.Interfacetype && item.Interfacetype === jCfgDevice.interfacetype) && ((item.MACAddress && item.MACAddress === jCfgDevice.macaddress) || (item.IPAddress && item.IPAddress === jCfgDevice.ipaddress)));});
            const jCachedDevice = maFbCachedDevices.find(function (item) { return ((item.MACAddress && item.MACAddress === jCfgDevice.macaddress) || (item.IPAddress && item.IPAddress === jCfgDevice.ipaddress)); });
            that.log.debug(fctNameId + ', jCachedDevice: ' + JSON.stringify(jCachedDevice));
            //!P!let jCfgDeviceOld: c.IDevice = <c.IDevice>aCfgDevicesListOld.find((item: c.IDevice) => { return ((item.interfacetype && item.interfacetype === jCfgDevice.interfacetype) && ((item.macaddress && item.macaddress === jCfgDevice.macaddress) || (item.ipaddress && item.ipaddress === jCfgDevice.ipaddress)));});
            let jCfgDeviceOld = aCfgDevicesListOld.find((item) => { return ((item.macaddress && item.macaddress === jCfgDevice.macaddress) || (item.ipaddress && item.ipaddress === jCfgDevice.ipaddress)); });
            if (jCfgDeviceOld)
                jCfgDeviceOld = JSON.parse(JSON.stringify(jCfgDeviceOld));
            that.log.debug(fctNameId + ', jCfgDeviceOld: ' + JSON.stringify(jCfgDeviceOld));
            if (jCfgDevice.watch) {
                // device watched, create datapoints / update value
                mFbObj.check_set_deviceData(that, jCfgDevice, jCachedDevice);
            }
            if (jCachedDevice) {
                if (jCachedDevice.IPAddress != jCfgDevice.ipaddress) {
                    // IP has changed
                    if (that.config.warningDestination == 'log') {
                        that.log.warn('IP-address for device "' + jCfgDevice.devicename + '" changed (old: "' + jCfgDevice.ipaddress + '"; new: "' + jCachedDevice.IPAddress + '"; MAC: "' + jCachedDevice.MACAddress + '"');
                    }
                    if (that.config.warningDestination == 'telegram.0') {
                        that.sendTo('telegram.0', (new Date(), "JJJJ.MM.TT SS:mm:ss") + ' MAC-address for device "' + jCfgDevice.devicename + '" changed (old: "' + jCfgDevice.ipaddress + '"; new: "' + jCachedDevice.IPAddress + '"; MAC: "' + jCachedDevice.MACAddress + '"');
                    }
                    // update aCfgDevicesList
                    /*!P!					if (idx >= 0) {
                                            aCfgDevicesList[idx].ipaddress = jCachedDevice.IPAddress;
                                            aCfgDevicesList[idx].changed = true;
                                            bDataChangedIP = true;
                                        } */
                    jCfgDevice.ipaddress = jCachedDevice.IPAddress;
                    jCfgDevice.changed = true;
                }
                if (jCfgDeviceOld) {
                    if (jCfgDeviceOld.devicename != jCfgDevice.devicename) { // device name has changed (bases on MAC / IP) --> remove old data
                        // check device exist
                        await that.getObjectAsync(c.dppDevices + jCfgDeviceOld.devicename)
                            .then(async (oDevice) => {
                            if (oDevice) {
                                that.log.debug(fctNameId + ', getObjectAsync; node "' + c.dppDevices + jCfgDeviceOld.devicename + '" for device exist');
                                // save old dates
                                await mFbObj.copy_oldDeviceData(that, jCfgDeviceOld, jCfgDevice);
                                // remove old device object
                                // !P!#6 remove old device object, ggf. Option, ob das passieren soll
                                mFbObj.delete_oldDeviceData(that, jCfgDeviceOld);
                            }
                            else {
                                that.log.debug(fctNameId + ', getObjectAsync; old node "' + c.dppDevices + jCfgDeviceOld.devicename + '" for device is already removed');
                            }
                        });
                    }
                    if (jCfgDeviceOld.ownername != jCfgDevice.ownername) {
                        // owner has changed
                        bDataChangedOwner = true;
                    }
                    if (jCfgDeviceOld.warnOn != jCfgDevice.warnOn) {
                        // warnOn has changed
                        bDataChangedWarn = true;
                    }
                    if (jCfgDeviceOld.warnOff != jCfgDevice.warnOff) {
                        // warnOff has changed
                        bDataChangedWarn = true;
                    }
                    if (jCfgDeviceOld.watch != jCfgDevice.watch) {
                        // watch has changed
                        bDataChangedWatch = true;
                    }
                }
            }
        });
    }
    that.log.silly(fctNameId + ', aCfgDevicesList: ' + JSON.stringify(aCfgDevicesList));
    that.log.silly(fctNameId + ', that.config.devicesList: ' + JSON.stringify(that.config.devicesList));
    if (bDataChangedIP || bDataChangedOwner || bDataChangedWarn || bDataChangedWatch)
        that.config.devicesList = aCfgDevicesList;
    that.config.devicesListIPChanged = bDataChangedIP;
    that.config.devicesListOwnerChanged = bDataChangedOwner;
    that.config.devicesListWarnChanged = bDataChangedWarn;
    that.config.devicesListWatchChanged = bDataChangedWatch;
    // JSON.parse(JSON.stringify(..., make copy no reference
    that.config.devicesListOld = JSON.parse(JSON.stringify(that.config.devicesList));
    that.log.debug(fctNameId + ', config.devicesListOld: ' + JSON.stringify(that.config.devicesListOld));
    that.log.debug(fctNameId + ' finished');
} // updateDevices()
function decrypt(sKey, sValue) {
    let sResult = '';
    for (let i = 0; i < sValue.length; ++i) {
        sResult += String.fromCharCode(sKey[i % sKey.length].charCodeAt(0) ^ sValue.charCodeAt(i));
    }
    return sResult;
} // decrypt()
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new FbTr064(options);
}
else {
    // otherwise start the instance directly
    (() => new FbTr064())();
}
//# sourceMappingURL=main.js.map