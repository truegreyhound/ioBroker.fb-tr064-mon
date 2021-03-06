"use strict";
//!P! ?? import { hostname } from "os";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTML = '<table class="mdui-table"><thead><tr><th>Name</th><th>Status</th><th>Kommt</th><th>Geht</th></tr></thead><tbody>';
exports.HTML_HISTORY = '<table class="mdui-table"><thead><tr><th>Status</th><th>Date</th></tr></thead><tbody>';
exports.HTML_END = '</body></table>';
//export const HTML_GUEST  = '<table class="mdui-table"><thead><tr><th>Hostname</th><th>IPAddress</th><th>MACAddress</th></tr></thead><tbody>';
exports.TR064_DESC = '/tr64desc.xml';
exports.TR064_DEVINFO = '/deviceinfoSCPD.xml';
exports.TR064_HOSTS = '/hostsSCPD.xml';
//!P!
exports.HTML_GUEST = '';
exports.URN = 'urn:dslforum-org:service:';
exports.GetSpecificHostEntry = 'GetSpecificHostEntry';
exports.GetSecurityPort = 'GetSecurityPort';
exports.X_AVM_DE_GetHostListPath = 'X_AVM-DE_GetHostListPath';
exports.X_AVM_DE_GetSpecificHostEntryByIP = 'X_AVM-DE_GetSpecificHostEntryByIP';
exports.supportedFunctions = [];
var CachedDevice_State;
(function (CachedDevice_State) {
    CachedDevice_State["new"] = "new";
    CachedDevice_State["non"] = "non";
    CachedDevice_State["removed"] = "removed";
    CachedDevice_State["changed"] = "changed";
})(CachedDevice_State = exports.CachedDevice_State || (exports.CachedDevice_State = {}));
;
exports.dppFB_Info = 'info.';
exports.dppFB_Info_SupportedFunctions = 'info.supportedFunctions.';
exports.dppDevices = 'devices.';
exports.idFritzBoxVersion = exports.dppFB_Info + 'version';
exports.idFritzBoxName = exports.dppFB_Info + 'name';
exports.idSupportedFunctions_FritzBoxVersion = exports.dppFB_Info + 'supportedFunctions_version';
exports.idFritzBoxIP = exports.dppFB_Info + 'fb_IP';
exports.idFritzBoxMAC = exports.dppFB_Info + 'fb_MAC';
exports.idCountDevicesTotal = exports.dppDevices + 'countDevicesTotal';
exports.idCountDevicesActive = exports.dppDevices + 'countDevicesActive';
exports.idCountDevicesActiveLAN = exports.dppDevices + 'countDevicesActiveLAN';
exports.idCountDevicesActiveWLAN = exports.dppDevices + 'countDevicesActiveWLAN';
exports.idCountDevicesActiveGuests = exports.dppDevices + 'countDevicesActiveGuests';
exports.idDeviceListActive_JSON = exports.dppDevices + 'deviceListActive_JSON';
exports.idDeviceListInactive_JSON = exports.dppDevices + 'deviceListInactive_JSON';
exports.idDeviceListActiveLAN_JSON = exports.dppDevices + 'deviceListActiveLAN_JSON';
exports.idDeviceListActiveWLAN_JSON = exports.dppDevices + 'deviceListActiveWLAN_JSON';
exports.idDeviceListActiveGuests_JSON = exports.dppDevices + 'deviceListActiveGuests_JSON';
exports.idDeviceList_NewAddedDevices_JSON = exports.dppDevices + 'deviceList_NewAddedDevices_JSON';
exports.idDeviceList_RemovedDevices_JSON = exports.dppDevices + 'deviceList_RemovedDevices_JSON';
exports.idDeviceList_Warn_JSON = exports.dppDevices + 'deviceList_warn_JSON';
exports.idDeviceList_Warn_active_JSON = exports.dppDevices + 'deviceList_warn_active_JSON';
exports.idDeviceList_Warn_inactive_JSON = exports.dppDevices + 'deviceList_warn_inactive_JSON';
exports.idDeviceList_DailyChanges_JSON = exports.dppDevices + 'deviceList_daily_changes_JSON';
exports.idDeviceList_DailyChanges_count = exports.dppDevices + 'deviceList_daily_changes_count';
exports.idDeviceList_DailyChanges_maxCount = exports.dppDevices + 'deviceList_daily_changes_max_count';
exports.idDeviceList_CachedDevices_JSON = exports.dppDevices + 'deviceList_cached_devices_JSON';
exports.idDeviceList_View_JSON = exports.dppDevices + 'deviceList_view_JSON';
exports.idDeviceList_View_JSON_Count = exports.dppDevices + 'deviceList_view_JSON_count';
exports.idDeviceList_View_Name = exports.dppDevices + 'deviceList_view_name';
exports.idDeviceList_ActiveChanged = exports.dppDevices + 'deviceList_active_changed'; // active, hostname or ip changed
exports.idDeviceList_IPChanged = exports.dppDevices + 'deviceList_ip_changed'; // IP
exports.idDeviceList_OwnerChanged = exports.dppDevices + 'deviceList_owner_changed'; // owner
exports.idDeviceList_WarnChanged = exports.dppDevices + 'deviceList_warn_changed'; // warn
exports.idDeviceList_WatchChanged = exports.dppDevices + 'deviceList_watch_changed'; // watch
exports.idnDeviceActive = 'active';
exports.idnDeviceName = 'deviceName';
exports.idnDeviceHostname = 'hostName';
exports.idnDeviceIP = 'IP';
exports.idnDeviceLastIP = 'IPlast';
exports.idnDeviceMAC = 'MAC';
exports.idnDeviceLastMAC = 'MAClast';
exports.idnDeviceOwner = 'owner';
exports.idnDeviceLastActive = 'lastActive';
exports.idnDeviceLastInactive = 'lastInactive';
exports.idnDeviceInterfaceType = 'interfacetype';
exports.idnDeviceFbPort = 'port';
exports.idnDeviceFbSpeed = 'speed';
exports.idnDeviceFbGuest = 'guest';
exports.idnDeviceFbWarnOn = 'warnOn';
exports.idnDeviceFbWarnOff = 'warnOff';
exports.idnDeviceFbWatch = 'watch';
//# sourceMappingURL=constants.js.map