/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @typescript-eslint/camelcase */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.30.1
 */

//!P!#3 instance-objects, updateDevices: hier müsste ein Mechanismus rein, der diesen Meldungstype nach n Meldungen für den Tag abschaltet; that.log.warn('device "' + oCfgDevice.devicename + '" without MAC address; IP: "' + oDeviceData.IPAddress + '"');

 /*!P!#4 instance-objects, updateDevices
	Wenn neue Option "delete unwatched" aktiv, dann  über Selector DP-Liste erstellen und beim Durchlauf verarbeitete löschen
	nach Durchlauf alle DPs in Liste löschen
*/

/* !P!
Das mit new und change muss noch mal debuggt werden, kommt auf CfgSeite nicht an, geänderte Liste wird dort aber erkannt

Listenmechanismus so umbauen, dass via einem Array alles "gesammelt" wird analog zu den ChangedDevices (mit ts). Die verschiedenen JSON-Listen dann per Filter aus dem Array erzeugen.
? Beim start für alle Action auf "removed" setzen, wenn dann am Ende noch welchen diesen Wert habe, dann ergibt dass die Removed-Liste und anschließend diese im Array löschen.

2020-12-04 11:42:51.578  - fb-tr064-mon.0 (6804) soapAction, request url https://192.168.200.101:49443/upnp/control/hosts; body: <?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ><s:Header><h:ClientAuth xmlns:h="http://soap-authentication.org/digest/2001/10/"s:mustUnderstand="1"><Nonce>99653D01ADA9D644</Nonce><Auth>2ca5df78159456923b285791c7159d2a</Auth><UserID>TR064</UserID><Realm>F!Box SOAP-Auth</Realm></h:ClientAuth></s:Header><s:Body><u:X_AVM-DE_GetHostListPath xmlns:u="urn:dslforum-org:service:Hosts:1"></u:X_AVM-DE_GetHostListPath></s:Body></s:Envelope>
>> timeout --> warn in log, Timeoutzähler, nach n Fehler ErrorMsg in Log und Adapter disable oder ?


Sortierung deviceName case intensitive

device K3 D8:50:E6:D3:07:87 192.168.200.109 > wird interface Ethernet nicht entfernt, obwohl nicht im Netz
IP-address for device "influx-01" changed (old: "192.168.200.105"; new: "192.168.200.107"; MAC: "90:1B:0E:BA:80:82" > kann es sein, dass das intern nicht aktualisiert wird?  IPlast

Was wenn angelegtes device watch und warn deaktiviert werden? Device löschen? --> b)


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
		Spalte warn  - geht das Geräte Offline, wird eine Warnung an den konfigurierten Sender gesendet (Off, Log, Telegram)

	Initial sind in der deviceList für die Konfiguration deviceName == hostName von der Fritzbox.

	Wird für ein device "watch" aktiviert, dann wird nach dem Speichern der DP für das device wird mit dem deviceName angelegt.

	Wird der "device name" in der Adapterkonfiguration geändert, wird das Geräte nach dem Speichern unter diesem Namen neu angelegt, 
	die Werte vom alten DP übernommen und der alte dann gelöscht.
	Außerdem sind ggf. weitere Konfigurationen manuell zu setzen (enum functions (presence_device), etc.).

*/


// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from '@iobroker/adapter-core';

// Load your modules here, e.g.:
// import * as fs from 'fs';
// load your modules here, e.g.:

//!P!import util = require('util');
//!P!import dateFormat = require('dateformat');
//!P!import {parse, stringify} from 'flatted';

//own libraries
import * as c from './lib/constants';
import * as mFb from './lib/fb';
//import mFb = require('./lib/fb');
import mFbObj = require('./lib/instance-objects');
//!P!import { adapter } from '@iobroker/adapter-core';


//!P!let adapter: any;

let maCachedDevices: c.ICachedDevice[] = [];					// updated device data from FB
let maChangedDevices: c.IChangedDevice[] = [];					// list mit den letzen xx device changes

let mScheduleStatus: any = null;
let mTimerStartUpdate: any = null;
let mFbClass: mFb.Fb;



/*
	get the list with devices from the box
*/
async function getDeviceList(that: any, cfg: any, Fb: mFb.Fb): Promise<any> {
	const fctName: string = 'getDeviceList';
	that.log.debug(fctName + ' started');
	that.log.debug(fctName + ', cfg: ' + JSON.stringify(cfg));

	try {
		//get device list
		const sHostPath: any = await Fb.soapAction(Fb, '/upnp/control/hosts', c.URN + 'Hosts:1', c.X_AVM_DE_GetHostListPath, null);
		that.log.debug(fctName + ', sHostPath: ' + JSON.stringify(sHostPath) + '; typeof: ' + typeof sHostPath);

		const sUrl: string = 'http://' + Fb.host + ':' + Fb.port + sHostPath['NewX_AVM-DE_HostListPath'];
		that.log.debug(fctName + ', sUrl : ' + sUrl);

		const deviceList = await Fb.getDeviceList(sUrl);

		that.log.silly(fctName + ', deviceList: ' + JSON.stringify(deviceList));
		//that.log.debug(fctName + ', deviceList["List"]["Item"]: ' + JSON.stringify(deviceList['List']['Item']));

		//!P! ?? let errorCnt: number = 0;

		that.setStateChangedAsync('info.connection', { val: true, ack: true });			//Fritzbox connection established
		that.log.debug(fctName + ', setState("info.connection", TRUE)');

		that.log.debug(fctName + ' finished');

		return deviceList['List']['Item'];

	}  catch (e) {
		//!P! showError(fctName + ': ' + e.message);
		that.log.error(fctName + ': ' + e.message);

		return null;
	}

	that.log.debug(fctName + ' finished undefined');

} // getDeviceList()


/*
	createDeviceStatusLists(that: any, aDevices: any, bInitial?: boolean)
	that		- adapter context
	aDevices	- array with devices from the Fritz!Box
	bInitial	- ignore (empty) device configuration from adapter config page

	liest die

*/
async function createDeviceStatusLists(that: any, aFbDevices: c.IFbDevice[]) {
	const fctName: string = 'createDeviceStatusLists';

	let bInitial: boolean = false;			// true, if no item in config.devicesList
	let bInitialCache: boolean = false;		// true, if no item in maCachedDevices

	that.log.debug(fctName + ' started, bInitial: ' + bInitial);

	try {
//!P!		let aAllActiveDevices: JSON[] = [];
//!P!		let aAllActiveLANDevices: JSON[] = [];
//!P!		let aAllActiveWLANDevices: JSON[] = [];
//!P!		let aAllActiveGuestsDevices: JSON[] = [];
//!P!		let aAllInactiveDevices: JSON[] = [];
//!P!		let aDeviceList_Warn: JSON[] = [];
//!P!		let aDeviceList_Warn_active: JSON[] = [];
//!P!		let aDeviceList_Warn_inactive: JSON[] = [];
//!P!		let aNewDevices: JSON[] = [];

		//!PI! sonst ist aAllConfiguredDevices eine Referenz auf that.config.devicesList und splice verändert damit auch den Inhalt von that.config.devicesList
		let aAllConfiguredDevices: c.IDevice[] = JSON.parse(JSON.stringify(that.config.devicesList));

		that.log.silly(fctName + ', config.devicesList: ' + JSON.stringify((<c.IDeviceList>that.config.devicesList)));
		that.log.debug(fctName + ', config.devicesList.length: ' + that.config.devicesList.length);

		// reset status
		that.setStateChangedAsync(c.idDeviceList_IPChanged, false);
		that.setStateChangedAsync(c.idDeviceList_OwnerChanged, false);
		that.setStateChangedAsync(c.idDeviceList_WarnChanged, false);
		that.setStateChangedAsync(c.idDeviceList_WatchChanged, false);

		bInitial = (!that.config.devicesList || that.config.devicesList.length == 0);		// noch nicht im Adapter aufgerufen/gespeichert
		that.log.debug(fctName + ', bInitial: ' + bInitial);

		bInitialCache = (!maCachedDevices || maCachedDevices.length == 0);
		that.log.debug(fctName + ', bInitialCache: ' + bInitialCache);

		that.log.silly(fctName + ', on start; maChangedDevices: ' + JSON.stringify(maChangedDevices));
		that.log.silly(fctName + ', fbIP: ' + JSON.stringify(that.config.fbIP));

		const jCachedDummyDevice: c.ICachedDevice[] = [{
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
			ts: (new Date()).getTime(),
			Warn: false,
			Watch: false
		}];

		// map - Methode wendet auf jedes Element des Arrays die bereitgestellte Funktion an und gibt das Ergebnis in einem neuen Array zurück.
		// d. h., dass hier manipulierte Element oDevice wird hier zum neuen Element in aDevices
		aFbDevices.map((oDevice: c.IFbDevice) => {
			that.log.debug(fctName + ' > oDevice: ' + JSON.stringify(oDevice));
			// {"Index":"65","IPAddress":"192.168.200.146","MACAddress":"C8:3C:85:63:DC:83","Active":"1","HostName":"iFranks","InterfaceType":"802.11","X_AVM-DE_Port":"0","X_AVM-DE_Speed":"144","X_AVM-DE_UpdateAvailable":"0","X_AVM-DE_UpdateSuccessful":"unknown","X_AVM-DE_InfoURL":"","X_AVM-DE_Model":"","X_AVM-DE_URL":"","X_AVM-DE_Guest":"0"};

			let bDeviceNew: boolean = false;

			if(oDevice.IPAddress == that.config.fbIP) {
				// fb
				that.setStateChangedAsync(c.idFritzBoxIP, oDevice.IPAddress);
				that.setStateChangedAsync(c.idFritzBoxMAC, oDevice.MACAddress);
			} else {
				// get configured parameter for device like macaddress, watch, warn, ...
				// [{"devicename":"Acer-NB","macaddress":"00:1C:26:7D:02:D6","ipaddress":"192.168.200.157","new":false,"changed":false,"ownername":"","interfacetype":"","warn":false,"watch":false},{"devicename": . . .
				const oCfgData: c.IDevice = <c.IDevice>that.config.devicesList.find((item: any) => { return ((item.macaddress && item.macaddress === oDevice.MACAddress) || (item.ipaddress && item.ipaddress === oDevice.IPAddress));});
				that.log.debug(fctName + ', oCfgData: ' + JSON.stringify(oCfgData));

				// get device from adapter cache
				let jCachedDevice: c.ICachedDevice = <c.ICachedDevice>maCachedDevices.find((item: any) => { return ((item.MACAddress && item.MACAddress === oDevice.MACAddress) || (item.IPAddress && item.IPAddress === oDevice.IPAddress));});
				console.log(fctName + ',  jCachedDevice: ' + JSON.stringify(jCachedDevice));
			
				if (jCachedDevice) {
					// reset status values
					jCachedDevice.State = c.CachedDevice_State.removed;			// Vorbelegung, aller durchlaufenen haben später new oder updated
					jCachedDevice.Warn = false;
					jCachedDevice.Watch = false;
				} else {
					// new device
					bDeviceNew = true;

					jCachedDevice = {
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
						Warn: false,
						Watch: false
					}
				}

				let jChangedDevice: c.IChangedDevice = {
					DeviceName: '',
					Active: false,
					Active_lc: 0,
					Inactive_lc: 0,
					HostName: '',
					HostName_lc: 0,
					IPAddress: '',
					IPAddress_lc:  0,
					MACAddress: '',
					Interfacetype: '',
					Guest: false,
					Port: 0,
					Speed: 0,
					ts: 0,
					Count: 0,
					Action: ''
				}

				if(!oCfgData) {
					// new device without adapter config
					jCachedDevice.DeviceName = oDevice.HostName;
					jChangedDevice.DeviceName = oDevice.HostName;
				} else {
					jCachedDevice.DeviceName = oCfgData.devicename;
					jChangedDevice.DeviceName = oCfgData.devicename;

					jCachedDevice.Warn = oCfgData.warn;
					jCachedDevice.Watch = oCfgData.watch;
				}


				// get device from changed device list
				that.log.silly(fctName + ', maChangedDevices.find((item: any) => { return (((item.MACAddress && item.MACAddress === ' + oDevice.MACAddress + ') || (item.IPAddress && item.IPAddress === ' + oDevice.IPAddress + '))  && item.ts >= ' + ((new Date()).setHours(0, 0, 0, 0)) + ' && item.Action == ' + (oDevice.Active  == '1' ? 'active' : 'inactive') + ');})');
				const jChangedDeviceLast: c.IChangedDevice | undefined = <c.IChangedDevice | undefined>maChangedDevices.find((item: any) => { return (((item.MACAddress && item.MACAddress === oDevice.MACAddress) || (item.IPAddress && item.IPAddress === oDevice.IPAddress)) && item.ts >= (new Date()).setHours(0, 0, 0, 0) && item.Action == (oDevice.Active  == '1' ? 'active' : 'inactive'));});
				that.log.debug(fctName + ', jChangedDeviceLast: ' + JSON.stringify(jChangedDeviceLast));

//!P!				// known device in adapter config, remove from known list
				const nIdxCD = aAllConfiguredDevices.findIndex((item) => ((item.macaddress && item.macaddress === oDevice.MACAddress) || (item.ipaddress && item.ipaddress === oDevice.IPAddress)))
				that.log.silly(fctName + ', aAllConfiguredDevices.findIndex: ' + nIdxCD);

				if (nIdxCD >= 0) {
					aAllConfiguredDevices.splice(nIdxCD, 1);
				} else {
					that.log.error(fctName + ', item in aAllConfiguredDevices not found! Parameter error?');
				}
		
				// update cached device
				// state State to non, if ip address and hostname unchanged
				jCachedDevice.State = (jCachedDevice.State != c.CachedDevice_State.new && jCachedDevice.IPAddress == oDevice.IPAddress && jCachedDevice.HostName == oDevice.HostName ? c.CachedDevice_State.non : c.CachedDevice_State.changed);

				jCachedDevice.IPAddress_lc = (jCachedDevice.IPAddress != '' && jCachedDevice.IPAddress != oDevice.IPAddress ? (new Date()).getTime() : jCachedDevice.IPAddress_lc);
				jCachedDevice.IPAddress = oDevice.IPAddress;
				jCachedDevice.MACAddress = oDevice.MACAddress;

				jCachedDevice.HostName_lc = (jCachedDevice.HostName != '' && jCachedDevice.HostName != oDevice.HostName ? (new Date()).getTime() : jCachedDevice.HostName_lc);
				jCachedDevice.HostName = oDevice.HostName;

				// update for changed device list
				jChangedDevice.ts = (jChangedDeviceLast ? jChangedDeviceLast.ts : (new Date()).getTime());
				jChangedDevice.IPAddress = oDevice.IPAddress;
				jChangedDevice.IPAddress_lc = (jChangedDeviceLast ? (jChangedDeviceLast.IPAddress != '' && jChangedDeviceLast.IPAddress != oDevice.IPAddress ? (new Date()).getTime() : jChangedDeviceLast.IPAddress_lc) : 0);
				jChangedDevice.MACAddress = oDevice.MACAddress;

				jChangedDevice.HostName = oDevice.HostName;
				jChangedDevice.HostName_lc = (jChangedDeviceLast ? (jChangedDeviceLast.HostName != '' && jChangedDeviceLast.HostName != oDevice.HostName ? (new Date()).getTime() : jChangedDeviceLast.HostName_lc) : 0);
				jChangedDevice.Count = (jChangedDeviceLast ? jChangedDeviceLast.Count : 0);


				if (oDevice.Active == "0") {		// inactive
					jCachedDevice.Inactive_lc = (jCachedDevice.Active != false || bInitialCache ? (new Date()).getTime() : jCachedDevice.Inactive_lc);
					jCachedDevice.Active = false;

					jChangedDevice.Active = false;
					jChangedDevice.Inactive_lc = (jChangedDeviceLast ? (jChangedDeviceLast.Active != false ? (new Date()).getTime() : jChangedDeviceLast.Inactive_lc) : (new Date()).getTime());
					jChangedDevice.Action = jChangedDevice.Action + 'inactive';
				} else {
					// device active
					jCachedDevice.Active_lc = (jCachedDevice.Active != true ? (new Date()).getTime() : jCachedDevice.Active_lc);
					jCachedDevice.Active = true;

					jChangedDevice.Active = true;
					jChangedDevice.Active_lc = (jChangedDeviceLast ? (jChangedDeviceLast.Active != true ? (new Date()).getTime() : jChangedDeviceLast.Active_lc) : (new Date()).getTime());
					jChangedDevice.Action = jChangedDevice.Action + 'active';

					jCachedDevice.Interfacetype = oDevice.InterfaceType;
					if (oDevice.X_AVM_DE_Port != '') jCachedDevice.Port = parseInt(oDevice.X_AVM_DE_Port);
					if (oDevice.X_AVM_DE_Speed != '') jCachedDevice.Speed = parseInt(oDevice.X_AVM_DE_Speed);
					jCachedDevice.Guest = (oDevice.X_AVM_DE_Guest != '' ? (oDevice.X_AVM_DE_Guest == '1') : false);

					jChangedDevice.Interfacetype = oDevice.InterfaceType;
					jChangedDevice.Port = (oDevice.X_AVM_DE_Port != '' ? parseInt(oDevice.X_AVM_DE_Port) : (jChangedDeviceLast ? jChangedDeviceLast.Port : 0));
					jChangedDevice.Speed = ((oDevice.X_AVM_DE_Speed != '' && (!that.config.ignoreSpeed || !jChangedDeviceLast)) ? parseInt(oDevice.X_AVM_DE_Speed) : (jChangedDeviceLast ? jChangedDeviceLast.Speed : 0));
					jChangedDevice.Guest = (oDevice.X_AVM_DE_Guest != '' ? (oDevice.X_AVM_DE_Guest == '1') : (jChangedDeviceLast ? jChangedDeviceLast.Guest : false));

				}

				that.log.debug(fctName + ', jChangedDevice: ' + JSON.stringify(jChangedDevice) + ', jChangedDeviceLast: ' + (jChangedDeviceLast));
				if (jChangedDeviceLast) {
					if (JSON.stringify(jChangedDevice) != JSON.stringify(jChangedDeviceLast)) {
						jChangedDevice.Count++;
						jChangedDevice.ts = (new Date()).getTime();
						// update speed, other property is different (if that.config.ignoreSpeed == true)
						jChangedDevice.Speed = ((oDevice.X_AVM_DE_Speed != '' ) ? parseInt(oDevice.X_AVM_DE_Speed) : (jChangedDeviceLast ? jChangedDeviceLast.Speed : 0));
	
						//!P! die Frage ist, sollten die Daten in der vorhandenen Zeile aktualisiert werden, ggf. nur bei active oder gelöscht und die neue Werte an den Anfang geschoben werden?

						// replace item
						const nL: number = maChangedDevices.length;

						that.log.silly(fctName + ', maChangedDevices.findIndex((item: any) => (((item.macaddress && item.macaddress === ' + oDevice.MACAddress + ') || (item.ipaddress && item.ipaddress === ' + oDevice.IPAddress + ')) && item.ts >= ' + (new Date()).setHours(0, 0, 0, 0) + ' && item.Action == ' + (oDevice.Active == '1' ? 'active' : 'inactive') + '))');
						const nIdx: number = maChangedDevices.findIndex((item: any) => (((item.MACAddress && item.MACAddress === oDevice.MACAddress) || (item.IPAddress && item.IPAddress === oDevice.IPAddress)) && item.ts >= (new Date()).setHours(0, 0, 0, 0) && item.Action == (oDevice.Active == '1' ? 'active' : 'inactive')));
						that.log.silly(fctName + ', maChangedDevices.findIndex: ' + nIdx);

						if (nIdx >= 0) {
							maChangedDevices.splice(nIdx, 1);
							that.log.silly(fctName + ', maChangedDevices after splice, length (' + nL + '/' + maChangedDevices.length + '): ' + JSON.stringify(maChangedDevices));
						} else {
							that.log.error(fctName + ', item in maChangedDevices not found! Parameter error?');
						}

						// add new device info
						maChangedDevices.unshift(jChangedDevice);
					}
				} else {
					that.log.silly(fctName + ', add jChangedDevice to maChangedDevices ...');

					maChangedDevices.unshift(jChangedDevice);
				}

				if (bDeviceNew) maCachedDevices.push(jCachedDevice);
			}1

		});
		that.log.silly(fctName + ', maCachedDevices: ' + JSON.stringify(maCachedDevices));
		that.log.silly(fctName + ', maChangedDevices: ' + JSON.stringify(maChangedDevices));

		// check for removed devices in adapter config
		if (aAllConfiguredDevices.length > 0) {
			that.log.warn(fctName + ', following in adapter configured devices removed from Fritz!Box network list: ' + JSON.stringify(aAllConfiguredDevices));

			let bDeviceRemoved: boolean = false;
			aAllConfiguredDevices.map((oDevice: c.IDevice) => {
				that.log.silly(fctName + ', removed device; oDevice: ' + JSON.stringify(oDevice));
				bDeviceRemoved = true;
				
				let sDevice: string = '{"Active": "' + false + '", "IPAddress": "' + oDevice.ipaddress + '", "MACAddress": "' + oDevice.macaddress + '", "HostName": "' + oDevice.devicename + '"}';
				that.log.silly(fctName + ', removed device; sDevice: ' + sDevice);

				if (oDevice.warn) that.log.warn(fctName + ', following device removed from Fritz!Box network list: ' + JSON.stringify(sDevice));

				//!P! ggf, muss hostname der cfgTable im Adapter hinzugefügt werden, wenn das so Probleme macht!?
				let jChangedDevice: c.IChangedDevice = {
					DeviceName: oDevice.devicename,
					Active: false,
					Active_lc: 0,
					Inactive_lc: 0,
					HostName: oDevice.devicename,
					HostName_lc: 0,
					IPAddress: oDevice.ipaddress,
					IPAddress_lc:  0,
					MACAddress: oDevice.macaddress,
					Interfacetype: oDevice.interfacetype,
					Guest: (oDevice.guest ? oDevice.guest : false),
					Port: 0,
					Speed: 0,
					ts: (new Date()).getTime(),
					Count: 0,
					Action: 'removed'
				}
	
				maChangedDevices.unshift(jChangedDevice);

				// remove from that.config.devicesList
				const nIdxDL: number = that.config.devicesList.findIndex((item: any) => ((item.macaddress && item.macaddress === oDevice.macaddress) || (item.ipaddress && item.ipaddress === oDevice.ipaddress)));
				that.log.silly(fctName + ', maChangedDevices.findIndex: ' + nIdxDL);

				if (nIdxDL >= 0) {
					that.config.devicesList.splice(nIdxDL, 1);
				} else {
					that.log.error(fctName + ', item in config.devicesList not found! Parameter error?');
				}
			});
			if (bDeviceRemoved) that.log.debug(fctName + ', maChangedDevices with removed devices: ' + JSON.stringify(maChangedDevices));
		}
		that.log.debug(fctName + ', check for removed device in adapter config finished');
		that.setStateChangedAsync(c.idDeviceList_RemovedDevices_JSON,  JSON.stringify(aAllConfiguredDevices));


		// check / prepare size daily changes list
		const dpoDeviceList_DailyChanges_maxCount: ioBroker.State | null | undefined = await that.getStateAsync(c.idDeviceList_DailyChanges_maxCount);
		let nMaxCount: number = 99;

		if (dpoDeviceList_DailyChanges_maxCount && dpoDeviceList_DailyChanges_maxCount.val) {
			nMaxCount = <number>dpoDeviceList_DailyChanges_maxCount.val;
		}
		that.log.debug(fctName + ', check for maChangedDevices item count: ' + maChangedDevices.length + '; nMaxCount: ' + nMaxCount);

		if (maChangedDevices.length > nMaxCount) {
			maChangedDevices = maChangedDevices.slice(0, nMaxCount);
		}
		that.log.debug(fctName + ', saving maChangedDevices: ' + JSON.stringify(maChangedDevices));

		that.setStateChangedAsync(c.idDeviceList_DailyChanges_JSON, JSON.stringify(maChangedDevices));
		that.setStateChangedAsync(c.idDeviceList_DailyChanges_count, maChangedDevices.length);


		// write data to data points
		that.log.debug(fctName + ', update json lists ...');

		let aFiltered: c.ICachedDevice[] = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceListActive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == false && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == false && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceListInactive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Interfacetype == 'Ethernet' && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == true && device.Interfacetype == \'Ethernet\' && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceListActiveLAN_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Interfacetype == '802.11' && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == true && device.Interfacetype == \'802.11\' && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceListActiveWLAN_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceListActiveGuests_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Warn == true && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Warn == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceList_Warn_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Warn == true && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active == true && device.Warn == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceList_Warn_active_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == false && device.Warn == true && device.State != c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.Active ?= false && device.Warn == true && device.State != c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceList_Warn_inactive_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));

		//!P! noch benötigt?
		that.setStateChangedAsync(c.idCountDevicesActive, maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.State != c.CachedDevice_State.removed)).length);
		that.setStateChangedAsync(c.idCountDevicesActiveLAN, maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Interfacetype == 'Ethernet' && device.State != c.CachedDevice_State.removed)).length);
		that.setStateChangedAsync(c.idCountDevicesActiveWLAN, maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Interfacetype == '802.11' && device.State != c.CachedDevice_State.removed)).length);
		that.setStateChangedAsync(c.idCountDevicesActiveGuests, maCachedDevices.filter((device: c.ICachedDevice) => (device.Active == true && device.Guest == true && device.State != c.CachedDevice_State.removed)).length);

		
		that.setStateChangedAsync(c.idDeviceList_IPChanged, (that.config.devicesListIPChanged) ? that.config.devicesListIPChanged : false);
		that.setStateChangedAsync(c.idDeviceList_OwnerChanged, (that.config.devicesListOwnerChanged) ? that.config.devicesListOwnerChanged : false);
		that.setStateChangedAsync(c.idDeviceList_WarnChanged, (that.config.devicesListWarnChanged) ? that.config.devicesListWarnChanged : false);
		that.setStateChangedAsync(c.idDeviceList_WatchChanged, (that.config.devicesListWatchChanged) ? that.config.devicesListWatchChanged : false);

		
		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.State == c.CachedDevice_State.new));
		that.log.debug(fctName + ', aFiltered (device.State == c.CachedDevice_State.new): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceList_NewAddedDevices_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));
		that.log.warn(fctName + ', follwing new device(s) from Fritz!Box network list detected: ' + JSON.stringify(aFiltered));

		aFiltered = maCachedDevices.filter((device: c.ICachedDevice) => (device.State == c.CachedDevice_State.removed));
		that.log.debug(fctName + ', aFiltered (device.State == c.CachedDevice_State.removed): ' + JSON.stringify(aFiltered));
		that.setStateChangedAsync(c.idDeviceList_RemovedDevices_JSON, JSON.stringify((aFiltered.length > 0 ? aFiltered : jCachedDummyDevice)));
		that.log.warn(fctName + ', follwing device(s) removed on Fritz!Box network list: ' + JSON.stringify(aFiltered));

		// remove from cached devices list
		maCachedDevices = maCachedDevices.filter((device: c.ICachedDevice) => (device.State != c.CachedDevice_State.removed));
		that.setStateChangedAsync(c.idDeviceList_CachedDevices_JSON, JSON.stringify(maCachedDevices));

//!P! ggf. DP for lastRun, allerdings ist das auch an den ts der JSON Listen zu erkennen

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
			fbIP: string;
			fbPort: number;
			fbUID: string;
			fbPassword: any;
			fbQueryInterval: number;
			warningDestination: string;
//			dateFormat: string;
			devicesList: any;
			devicesListOld: any;
			devicesListIPChanged: boolean;
			devicesListOwnerChanged: boolean;
			devicesListWarnChanged: boolean;
			devicesListWatchChanged: boolean;
		}
	}
}

class FbTr064 extends utils.Adapter {

	public constructor(options: Partial<ioBroker.AdapterOptions> = {}) {
		super({
			...options,
			name: 'fb-tr064-mon',
		});

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

//!P!			this.log.info('onReady start ' + adapter.name + '; ip-address: ' + this.config.fbIP + '; polling interval: ' + this.config.fbQueryInterval + ' sec.');
			this.log.info('onReady start -++*** fb-tr064-mon; ip-address: ' + this.config.fbIP + '; polling interval: ' + this.config.fbQueryInterval + ' sec. ***++-');

			if (this.config.fbUID === '' || this.config.fbPassword === '' || this.config.fbIP === '') {
				this.log.error('onReady, Please set the connection params (ip, user, password, etc.) in the adapter options before starting the adapter!');

				this.setState('info.connection', { val: false, ack: true });

				this.setForeignState("system.adapter." + this.namespace + ".alive", false);		// stop adapter

				return;
			} else {
				// The adapters config (in the instance object everything under the attribute "native") is accessible via
				// this.config:
				const oSystemCfg: any = await this.getForeignObjectAsync('system.config');
				this.log.debug('onReady, oSystemCfg: ' + JSON.stringify(oSystemCfg));
				this.log.debug('onReady, adapterCfg: ' + JSON.stringify(this.config));

				if (oSystemCfg && oSystemCfg.native && oSystemCfg.native.secret) {
					//noinspection JSUnresolvedVariable
					this.config.fbPassword = decrypt(oSystemCfg.native.secret, this.config.fbPassword);
				} else {
					this.config.fbPassword = decrypt('SdoeQ85NTrg1B0FtEyzf', this.config.fbPassword);
				}

				//this.log.debug('onReady, configuration fbIP: ' + this.config.fbIP);
				this.log.debug('onReady, configuration fbUID: ' + this.config.fbUID);
				//this.log.debug('onReady, configuration fbPassword: ' + this.config.fbPassword);
				this.log.debug('onReady, configuration warningDestination: ' + this.config.warningDestination);

				// eslint-disable-next-line @typescript-eslint/camelcase
				this.config.fbPort = 49000;

				const jDeviceInfo: c.IDeviceInfo = {
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
				let bResult: boolean = await mFbClass.chkServices(this);
				this.log.debug('onReady, mFbClass.chkServices, bResult: ' + bResult);

				// check adapter configuration user/password
				if (!mFbClass.fbCommunicationError && this.config.fbUID != '' && this.config.fbPassword != '') {
					const resultGSP: any = await mFbClass.soapAction(mFbClass, '/upnp/control/deviceinfo', 'urn:dslforum-org:service:DeviceInfo:1', c.GetSecurityPort, null);
					this.log.debug('onReady, resultGSP: ' + JSON.stringify(resultGSP));

					this.log.debug('onReady, c.supportedFunctions: ' + JSON.stringify(c.supportedFunctions));

					if (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0) {
						mFbClass.sslPort = parseInt(resultGSP['NewSecurityPort']);
						this.log.debug('onReady, sslPort ' + mFbClass.sslPort);
					}

					const dpoDeviceList_CachedDevices: ioBroker.State | null | undefined = await this.getStateAsync(c.idDeviceList_CachedDevices_JSON);
					if (dpoDeviceList_CachedDevices) {
						try {
							maCachedDevices = JSON.parse(<string>dpoDeviceList_CachedDevices.val);
						} catch (err) {
							this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_CachedDevices_JSON + '): ' + err);
						}
					}
					
					const dpoDeviceList_DailyChanges: ioBroker.State | null | undefined = await this.getStateAsync(c.idDeviceList_DailyChanges_JSON);
					if (dpoDeviceList_DailyChanges) {
						try {
							maChangedDevices = JSON.parse(<string>dpoDeviceList_DailyChanges.val);
						} catch (err) {
							this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_DailyChanges_JSON + '): ' + err);
						}
					}
					
					await this.updateDevicesStatus();

					// in this template all states changes inside the adapters namespace are subscribed
					//!P!this.subscribeStates('*');
					this.subscribeStates(c.idDeviceList_DailyChanges_JSON);
					this.subscribeStates(c.idDeviceList_View_Name);
					
					// load set JSON table
					this.getStateAsync(c.idDeviceList_View_Name, async (err: Error, state: ioBroker.State | null | undefined) => {
						try {
							if (!err && state) {
								const sTableName : string = state.val;

								await this.setStateAsync(c.idDeviceList_View_Name, '');
								this.setStateAsync(c.idDeviceList_View_Name, sTableName);
							}
						} catch (err) {
							this.log.error('onReady. error on getStateAsync(' + c.idDeviceList_View_Name + '): ' + err);
						}
					});

					//!T!this.onMessage({"command":"updateDevicesList","message":{"onlyActive":true,"reread":false},"from":"system.adapter.admin.0","callback":{"message":{"onlyActive":true,"reread":false},"id":320,"ack":false,"time":1583270558930},"_id":81771421});
				}
//			});

			}
        } catch (e) {
            this.setState('info.connection', { val: false, ack: true });

			this.log.error('onReady: ' + e.message);
		}
		
		this.log.debug('onReady finished');
	} // onReady()


	private async updateDevicesStatus() {
		const fctName: string = 'updateDevicesStatus';
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

				items = await getDeviceList(this, null, mFbClass);
			}
			this.log.debug('updateDevicesStatus, config.devicesList: ' + JSON.stringify(this.config.devicesList));
			this.log.debug('updateDevicesStatus, FB getDeviceList items: ' + JSON.stringify(items));

			if (items) {
				// splitt and write in data points
				createDeviceStatusLists(this, items);
			}
			
			// update periodical
			this.log.debug(fctName + ', this.config.devicesList.length: ' + this.config.devicesList.length + '; GetSecurityPort: ' + (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0));

 			if(!mScheduleStatus && this.config.devicesList.length > 0 && (c.supportedFunctions.findIndex(x => x === 'GetSecurityPort') >= 0)) {
				mScheduleStatus = setInterval(() => this.updateDevicesStatus(), this.config.fbQueryInterval * 1000);
				this.log.debug(fctName + ', scheduler for updateDevicesStatus created, run all ' + this.config.fbQueryInterval + ' seconds');
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

			if (mScheduleStatus) {
				clearInterval(mScheduleStatus);
				mScheduleStatus = null;
			}

			callback();
		} catch (e) {
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

		//!P!const that = this;

		if (state) {
			//  && !state.ack
			this.log.debug(fctName + ', id: ' + id + '; state: ' + JSON.stringify(state));

			let iddp: string = id.substr(this.namespace.length + 1);


			switch (iddp) {
				case c.idDeviceList_DailyChanges_JSON:
					fctNameId = 'subscription "' + c.idDeviceList_DailyChanges_JSON + '" changed';

					// devicesList aus config holen, und für alle WATCH-devices ggf. DPs anlegen und Status aktualisieren.
					//const aAllActiveDevices: JSON[] = JSON.parse(state.val);
					//this.log.debug(fctNameId + ', aAllActiveDevices.length: ' + ((aAllActiveDevices) ? aAllActiveDevices.length : 'undefined'));

					const aCfgDevicesList = this.config.devicesList;
					this.log.debug(fctNameId + ', aCfgDevicesList.length: ' + ((aCfgDevicesList) ? aCfgDevicesList.length : 'undefined'));

// "IPAddress": "' + oDevice.IPAddress + '", "MACAddress": "' + oDevice.MACAddress + '", "HostName": "' + oDevice.HostName + '"'
// "InterfaceType": "' + oDevice.InterfaceType + '", "Port": "' + oDevice['X_AVM-DE_Port'] + '", "Speed": "' + oDevice['X_AVM-DE_Speed'] + '"}';

					if((aCfgDevicesList) && aCfgDevicesList.length > 0) {
						mFbObj.updateDevices(this, aCfgDevicesList, maCachedDevices);

						this.log.debug(fctNameId + ', config.devicesListOld: ' + JSON.stringify(this.config.devicesListOld));
					}

					this.log.debug(fctNameId + ' finished');
					break;
				case c.idDeviceList_View_Name:
					fctNameId = 'subscription "' + c.idDeviceList_View_Name + '" changed';
					this.log.debug(fctNameId + ', to : ' + state.val);

					let idJsonState: string = '';

					switch (state.val) {
						case 'dailyChanges':
							idJsonState = c.idDeviceList_View_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'allDevices':
							idJsonState = c.idDeviceList_CachedDevices_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'activeDevices':
							idJsonState = c.idDeviceListActive_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'inactiveDevices':
							idJsonState = c.idDeviceListInactive_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'activeLanDevices':
							idJsonState = c.idDeviceListActiveLAN_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'activeWlanDevices':
							idJsonState = c.idDeviceListActiveWLAN_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'activeGuestDevices':
							idJsonState = c.idDeviceListActiveGuests_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'newAddedDevices':
							idJsonState = c.idDeviceList_NewAddedDevices_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'removedDevices':
							idJsonState = c.idDeviceList_RemovedDevices_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'configuredWarnDevices':
							idJsonState = c.idDeviceList_Warn_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'configuredWarnDevicesActive':
							idJsonState = c.idDeviceList_Warn_active_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
									this.log.error(fctNameId + ', error on getStateAsync(' + idJsonState + '): ' + err);
								}
							});

							break;
						case 'configuredWarnDevicesInactive':
							idJsonState = c.idDeviceList_Warn_inactive_JSON;

							this.getStateAsync(idJsonState, (err: Error, state: ioBroker.State | null | undefined) => {
								try {
									if (!err && state) {
										const jList = JSON.parse(state.val);

										this.setStateAsync(c.idDeviceList_View_JSON, state.val);
										this.setStateAsync(c.idDeviceList_View_JSON_Count, jList.length);
									}
								} catch (err) {
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
	async onMessage(obj: any): Promise<any> {		// obj: 'fb-tr064-mon.0', 'updateDevicesList', { onlyActive: true, reread: false }, function ...
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
						const fctNameId: string = 'onMessage "updateDevicesList"';

						if (!obj.callback) return false;

						// stop status scheduler
						if (mScheduleStatus) clearInterval(mScheduleStatus);
						mScheduleStatus = null;
			
						// stop start timer
						if (mTimerStartUpdate) clearTimeout(mTimerStartUpdate);
						mTimerStartUpdate = null;
			
						// create new list for adapter configuration
						let aNewCfgDevicesList: c.IDeviceList = { devices: [], onlyActive: false, error: undefined};
						
						const that = this;
						const aCfgDevicesList = JSON.parse(JSON.stringify(this.config.devicesList));
						that.log.debug(fctNameId + ', aCfgDevicesList: ' + JSON.stringify(aCfgDevicesList));
						this.log.debug(fctNameId + ', maAllDevices.length: ' + ((maCachedDevices) ? maCachedDevices.length : 'undefined'));

						maCachedDevices.map(function(oDevice: any) {
							that.log.debug(fctNameId + ' oDevice: ' + JSON.stringify(oDevice));
							// device active
							// aCfgDevicesList[0] = {devicename: "Acer-NB", macaddress: "00:1C:26:7D:02:D6", ipaddress: "192.168.200.157", ownername: "", interfacetype: "", …}
							const aCfgDevicesListItem: any = ((aCfgDevicesList) && aCfgDevicesList.length >= 0) ? getJsonArrayItem(aCfgDevicesList, oDevice.MACAddress, oDevice.IPAddress) : undefined;
							//!P! --> bei Aktualisierung AdapterCfg InterfaceType nur überschreiben, wenn device.InterfaceType != leer
							that.log.debug(fctNameId + ', aCfgDevicesListItem: ' + JSON.stringify(aCfgDevicesListItem));

							aNewCfgDevicesList.devices.push ({
								devicename: ((aCfgDevicesListItem) ? aCfgDevicesListItem.devicename : oDevice.HostName),
								ipaddress: oDevice.IPAddress,
								macaddress: oDevice.MACAddress,
								ownername: ((aCfgDevicesListItem) ? aCfgDevicesListItem.ownername : ''),
								interfacetype: (oDevice.InterfaceType != '') ? oDevice.InterfaceType : ((aCfgDevicesListItem) ? aCfgDevicesListItem.interfacetype : ''),
								active: (oDevice.active == '1' ? true : false),
								new: ((aCfgDevicesListItem) ? aCfgDevicesListItem.new : false),
								changed: ((aCfgDevicesListItem) ? aCfgDevicesListItem.changed : false),
								warn: ((aCfgDevicesListItem) ? aCfgDevicesListItem.warn : false),
								watch: ((aCfgDevicesListItem) ? aCfgDevicesListItem.watch : false),
								guest: (oDevice.guest == '1' ? true : false)
							} as c.IDevice);
						});
						this.log.debug(fctNameId + ', aNewCfgDevicesList: ' + JSON.stringify(aNewCfgDevicesList));

						mTimerStartUpdate = setTimeout(() => { 
							this.updateDevicesStatus();
						}, 60000);		// start update after 1 min.


						reply(this, aNewCfgDevicesList);

						this.log.debug(fctNameId + ' finished');

						return true;
						break;
					}
					case 'updateDevicesStatus':
						// stop status scheduler
						if (mScheduleStatus) clearInterval(mScheduleStatus);
						mScheduleStatus = null;
			
						// stop start timer
						if (mTimerStartUpdate) clearTimeout(mTimerStartUpdate);
						mTimerStartUpdate = null;
			
						// reset change flags
						for(let i = 0; i < this.config.devicesList.length; i++) {
							this.config.devicesList[i].new = false;
							this.config.devicesList[i].changed = false;
						}

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
		} catch (e) {
			//!P!showError('onMessage: ' + e.message);
			this.log.error('onMessage: ' + e.message);
		}
	}

} // onMessage()


function getJsonArrayItem(aJson: JSON[], sMAC: string, sIP: string): JSON | undefined {

	return <JSON>aJson.find((item: any) => { return ((item.macaddress && item.macaddress === sMAC) || (item.ipaddress && item.ipaddress === sIP));} );
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
	(() => new FbTr064()) ();
}
